#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
报销智能体 · Agent 执行循环（Harness 模式）
====================================================================
框架选型说明：
  不引入 LangChain/LlamaIndex 等重框架，自研轻量 Harness（执行线束）：
  - 报销场景工具只有 8 个、决策路径有限，重框架的抽象收益为负
  - 合规场景需要完全掌控"前置校验→中断确认→审计"每个细节，
    黑盒框架反而难做硬约束
  - Harness = 模型无关的执行循环：模型只负责"决策调哪个工具"，
    循环负责"执行、校验、回填、记录、熔断"

循环流程（最多 MAX_ROUNDS=5 轮）：
  模型决策 → 前置条件检查 → 执行工具 → 结果回填对话 → 再决策
                │
                └─ create_draft 特殊：返回 WAIT_CONFIRM，
                   循环暂停，草稿内容流式发给员工确认后恢复
"""

import json
import sqlite3
import time
import uuid
from typing import Callable, Dict, List, Optional

# ============================================================
# 配置常量
# ============================================================
MAX_ROUNDS = 5           # 最大决策轮数（防止模型陷入死循环）
MAX_TOOL_FAILS = 3       # 同一工具连续失败上限
QUOTA_TTL_MIN = 30       # 校验结果有效期（分钟），过期需重新校验


# ============================================================
# 【核心模块 ★后续复用：工具调用审计表】
# 每轮工具决策写一条日志，供阶段5/审计页分析决策链
# ============================================================
class ToolCallLogger:
    """工具调用日志：工具名、参数、耗时、结果摘要、是否被前置校验拒绝。"""

    DDL = """
    CREATE TABLE IF NOT EXISTS tool_calls (
        id TEXT PRIMARY KEY,              -- 调用ID
        session_id TEXT NOT NULL,         -- 会话ID
        round_no INTEGER NOT NULL,        -- 第几轮决策
        tool_name TEXT NOT NULL,          -- 工具名
        args TEXT,                        -- 入参 JSON
        duration_ms INTEGER,              -- 耗时（毫秒）
        result_summary TEXT,              -- 结果摘要（截断存储）
        blocked TEXT,                     -- 非空=被前置校验拒绝的原因
        created_at TEXT DEFAULT (datetime('now'))
    )"""

    def __init__(self, db_path: str = "agent.db"):
        self.conn = sqlite3.connect(db_path)
        self.conn.execute(self.DDL)
        self.conn.commit()

    def log(self, session_id: str, round_no: int, tool_name: str,
            args: dict, duration_ms: int, summary: str, blocked: str = ""):
        self.conn.execute(
            "INSERT INTO tool_calls VALUES (?,?,?,?,?,?,?,?,datetime('now'))",
            (str(uuid.uuid4()), session_id, round_no, tool_name,
             json.dumps(args, ensure_ascii=False), duration_ms,
             summary[:200], blocked))
        self.conn.commit()


# ============================================================
# 【核心模块 ★后续复用：会话工具状态本】
# 记录本会话已完成校验的"结果指纹"，create_draft 依赖它做硬校验
# 模型无法伪造此状态——只有工具执行成功才会写入
# ============================================================
class SessionToolState:
    def __init__(self):
        self.state: Dict = {
            "invoice": None,   # {"invoice_no":..,"result":"pass"/"fail","ts":..}
            "quota": None,     # {"category":..,"result":"pass"/"fail","ts":..}
            "draft": None,     # {"draft_id":..,"status":..}
        }

    @staticmethod
    def _fresh(ts: float) -> bool:
        """校验结果是否在有效期内（默认30分钟）。"""
        return (time.time() - ts) < QUOTA_TTL_MIN * 60

    def set_invoice(self, invoice_no: str, result: str):
        self.state["invoice"] = {"invoice_no": invoice_no,
                                 "result": result, "ts": time.time()}

    def set_quota(self, category: str, result: str):
        self.state["quota"] = {"category": category,
                               "result": result, "ts": time.time()}

    def check_create_draft_prereq(self, invoice_no: str) -> Optional[str]:
        """create_draft 的硬前置检查。返回 None=通过，否则返回拒绝原因。

        三个检查点（服务端强制，模型绕不过）：
        1. 发票校验必须通过且在有效期内
        2. 报销标准核查必须已执行且通过（或显式特批）
        3. 发票号指纹必须一致（防"校验A发票、给B发票建单"）
        """
        inv = self.state["invoice"]
        if not inv or inv["result"] != "pass" or not self._fresh(inv["ts"]):
            return "发票校验未通过或已过期，必须先调用 validate_invoice 并通过"
        if inv["invoice_no"] != invoice_no:
            return f"发票号不一致：已校验 {inv['invoice_no']}，建单请求为 {invoice_no}"
        quota = self.state["quota"]
        if not quota or not self._fresh(quota["ts"]):
            return "报销标准核查未执行或已过期，必须先调用 check_quota"
        return None  # 全部通过


# ============================================================
# 【核心模块 ★后续复用：工具注册表】
# 每个工具 = JSON Schema（给模型看）+ 执行函数（服务端实现）
# + 可选前置检查函数（硬约束）
# ============================================================
class Tool:
    def __init__(self, name: str, description: str, parameters: dict,
                executor: Callable, precondition: Optional[Callable] = None):
        self.name = name
        self.description = description
        self.parameters = parameters          # JSON Schema
        self.executor = executor              # (args, session_state) -> dict
        self.precondition = precondition      # (args, session_state) -> 拒绝原因或None


def build_tools(db) -> Dict[str, Tool]:
    """注册全部工具。校验类工具纯代码实现，不用 LLM（可靠且免费）。"""

    # ---- T1 检索制度（复用阶段1混合检索器，此处用桩实现演示）----
    def search_policy(args, st):
        # 真实实现：retriever.search(args["query"], top_k=3)
        return {"chunks": [{"doc_title": "policy.md",
                            "content": f"【检索结果】关于「{args['query']}」的制度条文..."}]}

    # ---- T2 发票抽取（真实实现用 LLM Structured Output，此处桩）----
    def extract_invoice(args, st):
        # 真实实现：LLM 从粘贴文本/图片OCR结果中抽取结构化字段
        return {"invoice_no": args.get("invoice_no", "INV-DEMO-001"),
                "amount": args.get("amount", 1400.0),
                "category": args.get("category", "住宿"),
                "city": args.get("city", "北京"),
                "days": args.get("days", 3),
                "issue_date": args.get("issue_date", "2025-06-01")}

    # ---- T3 发票校验（纯代码规则）----
    def validate_invoice(args, st):
        r = {"invoice_no": args["invoice_no"], "checks": {}}
        # 规则1：日期未超90天（演示中省略真实日期解析）
        r["checks"]["date_valid"] = True
        # 规则2：抬头为公司全称（演示恒过）
        r["checks"]["title_match"] = True
        # 规则3：发票号未重复报销（真实实现查 expense_drafts 表）
        r["checks"]["not_duplicated"] = True
        r["result"] = "pass" if all(r["checks"].values()) else "fail"
        st.set_invoice(r["invoice_no"], r["result"])  # 写入状态本
        return r

    # ---- T4 报销标准核查（纯代码比对配置表）----
    def check_quota(args, st):
        # 真实实现：查 quota_config 表（职级×费用类型×城市→限额）
        QUOTA = {("普通员工", "住宿", "北京"): (500, 3)}  # 500元/晚
        limit_per_night = QUOTA.get(("普通员工", args["category"], args["city"]),
                                    (350,))[0]
        actual = args["amount"]
        limit = limit_per_night * args.get("days", 1)
        r = {"category": args["category"], "limit": limit,
             "actual": actual, "gap": round(actual - limit, 2),
             "result": "pass" if actual <= limit else "fail"}
        st.set_quota(args["category"], r["result"])
        return r

    # ---- T5 建草稿：前置检查 + 确认中断 ----
    def create_draft(args, st):
        # 真实实现写 expense_drafts 表；演示返回草稿对象
        draft_id = "D" + uuid.uuid4().hex[:8]
        st.state["draft"] = {"draft_id": draft_id, "status": "wait_confirm"}
        return {"draft_id": draft_id, "status": "WAIT_CONFIRM",
                "draft": args,  # 草稿内容原样返回，由 Harness 流式发给员工
                "message": "请确认以上报销单内容，回复「确认提交」或「取消」"}

    def create_draft_precond(args, st):
        # 超标特批：quota=fail 时必须带 override_reason，否则拒绝
        quota = st.state["quota"]
        if quota and quota["result"] == "fail":
            if not args.get("override_reason"):
                return "报销超标且未提供特批原因(override_reason)，不能建单"
        return st.check_create_draft_prereq(args["invoice_no"])

    # ---- T8 追问（中断等待员工补充信息）----
    def ask_human(args, st):
        return {"status": "NEED_INPUT", "questions": args["questions"]}

    tools = [
        Tool("search_policy", "检索公司报销制度条文，回答制度类问题必用",
             {"type": "object", "properties": {
                 "query": {"type": "string", "description": "检索问题"}}},
             search_policy),
        Tool("extract_invoice", "从员工提供的发票文本中抽取结构化字段",
             {"type": "object", "properties": {
                 "invoice_text": {"type": "string"},
                 "invoice_no": {"type": "string"},
                 "amount": {"type": "number"}, "category": {"type": "string"},
                 "city": {"type": "string"}, "days": {"type": "integer"},
                 "issue_date": {"type": "string"}}},
             extract_invoice),
        Tool("validate_invoice", "校验发票合规性：日期/抬头/查重，建单前必过",
             {"type": "object", "properties": {
                 "invoice_no": {"type": "string"}}},
             validate_invoice),
        Tool("check_quota", "按职级×费用类型×城市核查报销限额，建单前必过",
             {"type": "object", "properties": {
                 "category": {"type": "string"}, "city": {"type": "string"},
                 "amount": {"type": "number"}, "days": {"type": "integer"}}},
             check_quota),
        Tool("create_draft", "创建报销单草稿。必须在 validate_invoice 和 check_quota 通过后调用",
             {"type": "object", "properties": {
                 "invoice_no": {"type": "string"}, "category": {"type": "string"},
                 "city": {"type": "string"}, "amount": {"type": "number"},
                 "days": {"type": "integer"},
                 "override_reason": {"type": "string",
                                     "description": "超标特批原因，仅超标时填写"}}},
             create_draft, create_draft_precond),
        Tool("ask_human", "信息不足时向员工追问，一次最多2个问题",
             {"type": "object", "properties": {
                 "questions": {"type": "array", "items": {"type": "string"}}}},
             ask_human),
    ]
    return {t.name: t for t in tools}


# ============================================================
# 【核心模块 ★后续复用：Agent Harness 执行循环】
# ============================================================
class AgentHarness:
    """执行循环：模型决策 → 前置检查 → 执行 → 回填 → 再决策，最多 MAX_ROUNDS 轮。

    llm_decide 是模型决策函数（注入依赖，便于替换/测试）：
        输入 messages（含工具结果回填），输出 {"tool": 名, "args": {...}}
        或 {"reply": "最终回答文本"}（不再调工具时）
    confirm_callback 用于 create_draft 的确认中断：
        循环暂停 → 回调方把草稿流式发给员工 → 员工确认 True/取消 False
    """

    def __init__(self, session_id: str, llm_decide: Callable,
                 logger: ToolCallLogger, confirm_callback: Optional[Callable] = None):
        self.session_id = session_id
        self.llm_decide = llm_decide
        self.logger = logger
        self.confirm = confirm_callback or (lambda draft: True)  # 默认自动确认
        self.tool_state = SessionToolState()
        self.fail_counts: Dict[str, int] = {}  # 各工具连续失败计数

    def _execute_tool(self, round_no: int, tool: Tool, args: dict) -> dict:
        """前置检查 → 执行 → 审计记录 的统一通道。"""
        # ① 连续失败熔断
        if self.fail_counts.get(tool.name, 0) >= MAX_TOOL_FAILS:
            return {"error": True, "code": "TOOL_REPEATED_FAIL",
                    "message": f"{tool.name} 连续失败{MAX_TOOL_FAILS}次，流程中止"}
        # ② 硬前置检查（服务端强制，模型绕不过）
        if tool.precondition:
            blocked = tool.precondition(args, self.tool_state)
            if blocked:
                self.logger.log(self.session_id, round_no, tool.name,
                                args, 0, "前置校验拒绝", blocked=blocked)
                return {"error": True, "code": "PREREQUISITE_NOT_MET",
                        "message": blocked}
        # ③ 执行
        t0 = time.time()
        try:
            result = tool.executor(args, self.tool_state)
            result.setdefault("error", False)
        except Exception as e:  # 工具异常转结构化错误回填给模型
            result = {"error": True, "code": "TOOL_ERROR", "message": str(e)}
        duration_ms = int((time.time() - t0) * 1000)
        # ④ 审计记录 + 失败计数
        self.fail_counts[tool.name] = 0 if not result.get("error") \
            else self.fail_counts.get(tool.name, 0) + 1
        self.logger.log(self.session_id, round_no, tool.name, args,
                        duration_ms, json.dumps(result, ensure_ascii=False))
        return result

    def run(self, question: str) -> List[dict]:
        """运行完整循环，返回每轮的轨迹事件列表（演示用/测试断言用）。"""
        trace = []
        messages = [{"role": "user", "content": question}]
        pending_confirm = None  # 等待员工确认的草稿

        for round_no in range(1, MAX_ROUNDS + 1):
            decision = self.llm_decide(messages)

            # ---- 分支1：模型决定直接回答，循环结束 ----
            if "reply" in decision:
                trace.append({"round": round_no, "type": "reply",
                              "content": decision["reply"]})
                return trace

            # ---- 分支2：模型决定调用工具 ----
            name, args = decision["tool"], decision.get("args", {})
            if name not in self._tools:  # 防御：未注册的工具名
                trace.append({"round": round_no, "type": "error",
                              "content": f"未知工具 {name}"})
                continue

            # ---- 特殊处理：create_draft 触发确认中断 ----
            if name == "create_draft":
                # 先做前置检查（不执行）
                tool = self._tools[name]
                blocked = tool.precondition(args, self.tool_state) \
                    if tool.precondition else None
                if blocked:
                    result = {"error": True, "code": "PREREQUISITE_NOT_MET",
                              "message": blocked}
                else:
                    # 把草稿内容"流式发给员工确认"——由回调方负责渲染
                    draft_preview = {"草稿类型": args.get("category"),
                                     "金额": args.get("amount"),
                                     "城市": args.get("city"),
                                     "天数": args.get("days"),
                                     "发票号": args.get("invoice_no")}
                    trace.append({"round": round_no, "type": "wait_confirm",
                                  "draft": draft_preview})
                    if not self.confirm(draft_preview):  # 员工拒绝
                        trace.append({"round": round_no, "type": "cancelled",
                                      "content": "员工取消了报销草稿"})
                        messages.append({"role": "tool", "content":
                                         "员工已取消报销草稿，请询问是否修改后重试"})
                        continue
                    result = self._execute_tool(round_no, tool, args)
                    # 员工确认 → 回填工具结果，进入下一轮（模型继续 submit 或收尾）
                    messages.append({"role": "tool", "name": name,
                                     "content": json.dumps(result, ensure_ascii=False)})
                    trace.append({"round": round_no, "type": "tool_result",
                                  "tool": name, "result": result})
                    continue
            else:
                result = self._execute_tool(round_no, self._tools[name], args)

            # ---- 结果回填，进入下一轮决策 ----
            messages.append({"role": "tool", "name": name,
                             "content": json.dumps(result, ensure_ascii=False)})
            trace.append({"round": round_no, "type": "tool_result",
                          "tool": name, "result": result})

        # 超过最大轮数熔断
        trace.append({"round": MAX_ROUNDS, "type": "abort",
                      "content": f"已达最大决策轮数{MAX_ROUNDS}，转人工处理"})
        return trace


# 给 Harness 挂全局工具表（模块级构建一次，所有会话共享）
AgentHarness._tools = build_tools(ToolCallLogger())


# ============================================================
# 演示入口：离线冒烟测试（用规则模拟 LLM 决策，验证硬约束）
# ============================================================
if __name__ == "__main__":
    print("=" * 60)
    print("冒烟测试1：跳过校验直接建单 → 必须被 PREREQUISITE_NOT_MET 拦截")
    print("=" * 60)

    def bad_decide(messages):
        """模拟一个'试图跳过校验'的模型：第一轮直接 create_draft。"""
        if not any(m.get("role") == "tool" for m in messages):
            return {"tool": "create_draft", "args": {
                "invoice_no": "INV-X", "category": "住宿",
                "city": "北京", "amount": 1400, "days": 3}}
        return {"reply": "（不应到达这里）"}

    harness = AgentHarness("sess-test-1", bad_decide, ToolCallLogger())
    for ev in harness.run("帮我报销"):
        print(f"  轮{ev['round']} [{ev['type']}]",
              ev.get("content") or ev.get("result", ""))

    print()
    print("=" * 60)
    print("冒烟测试2：正常流程 抽取→校验→查额度→建单（确认中断）")
    print("=" * 60)

    class GoodDecider:
        """按正确顺序调用工具的模拟决策器。"""
        def __init__(self):
            self.step = 0

        def __call__(self, messages):
            self.step += 1
            plan = [
                ("extract_invoice", {"invoice_no": "INV-001", "amount": 1400,
                                     "category": "住宿", "city": "北京", "days": 3}),
                ("validate_invoice", {"invoice_no": "INV-001"}),
                ("check_quota", {"category": "住宿", "city": "北京",
                                 "amount": 1400, "days": 3}),
                ("create_draft", {"invoice_no": "INV-001", "category": "住宿",
                                  "city": "北京", "amount": 1400, "days": 3}),
                (None, None),  # 第5轮直接收尾
            ]
            tool, args = plan[min(self.step - 1, 4)]
            if tool is None:
                return {"reply": "报销草稿已确认并创建，等待财务审批。"}
            return {"tool": tool, "args": args}

    confirmed = []

    def confirm_cb(draft):
        """模拟员工看到草稿内容后点击确认。"""
        confirmed.append(draft)
        print(f"  ✋ [确认中断] 草稿已发给员工确认：{draft}")
        return True

    harness2 = AgentHarness("sess-test-2", GoodDecider(), ToolCallLogger(),
                            confirm_callback=confirm_cb)
    for ev in harness2.run("报上个月去北京的差旅"):
        print(f"  轮{ev['round']} [{ev['type']}] {ev.get('tool', '')}",
              json.dumps(ev.get("result", ev.get("content", "")),
                         ensure_ascii=False)[:120])
