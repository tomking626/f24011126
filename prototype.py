#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
报销助手智能体 · 阶段1 最小原型（裸问答，命令行版）
====================================================================
功能流程：
  1. 读取本地报销制度 markdown 文件 → 按 500 字切片 → 向量化 → 存入 FAISS
  2. 命令行输入问题 → BM25 + 向量混合检索 top3 → 拼入提示词 → 调用 LLM 回答

供应商配置（通过环境变量，不写死任何一家）：
  LLM_BASE_URL   如 https://dashscope.aliyuncs.com/compatible-mode/v1
  LLM_API_KEY    对应供应商的 Key
  LLM_MODEL      如 qwen-plus / gpt-4o-mini / glm-4 等（OpenAI 兼容协议）
  EMBED_MODEL    向量化模型名，默认与 LLM_MODEL 同供应商

运行：
  python prototype.py policy.md
  python prototype.py policy.md --dry-run   # 无 API Key 时仅测试检索链路
"""

import argparse
import os
import re
import sys
from typing import List

import numpy as np

# ============================================================
# 【阶段0·配置】供应商可配置的核心：全部走 OpenAI 兼容协议
# 国产主流模型（通义/智谱/月之暗面/DeepSeek 等）均兼容此协议，
# 后续阶段只需改环境变量即可换供应商，代码零改动。
# ============================================================
from openai import OpenAI

LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")
EMBED_MODEL = os.getenv("EMBED_MODEL", "text-embedding-3-small")

# OpenAI 兼容客户端（全局单例，线程安全）
_client = OpenAI(base_url=LLM_BASE_URL, api_key=LLM_API_KEY) if LLM_API_KEY else None


# ============================================================
# 【核心模块 ★后续复用：LLMClient】
# 封装成独立函数，接口固定为 call_llm(messages) -> str
# 阶段2 会原样搬进 app/agents/llm_client.py
# ============================================================
def call_llm(messages: List[dict], temperature: float = 0.3) -> str:
    """调用大模型生成回答。

    参数:
        messages: OpenAI 协议格式的消息列表 [{"role":..., "content":...}]
        temperature: 越低越稳定；制度问答场景用低温度减少幻觉
    返回:
        模型生成的文本
    """
    if _client is None:
        raise RuntimeError("未配置 LLM_API_KEY 环境变量，无法调用大模型")
    resp = _client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=temperature,
    )
    return resp.choices[0].message.content


# ============================================================
# 【核心模块 ★后续复用：文本切片】
# 阶段2 会搬进 app/services/knowledge_service.py
# ============================================================
def chunk_markdown(text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
    """将 markdown 文本按 500 字切片，带 50 字重叠防止语义被截断。

    策略：先按标题/空行切成自然段，再对超长段做滑动窗口切分。
    """
    # 按标题或空行切成粗块（markdown 的 ## 标题是天然的语义边界）
    rough = re.split(r"\n(?=#{1,4}\s)|\n{2,}", text)
    chunks: List[str] = []
    for block in rough:
        block = block.strip()
        if not block:
            continue
        if len(block) <= chunk_size:
            chunks.append(block)
        else:
            # 滑动窗口：步长 = chunk_size - overlap，保证上下文连续
            step = chunk_size - overlap
            for i in range(0, len(block), step):
                chunks.append(block[i : i + chunk_size])
    return chunks


# ============================================================
# 【核心模块 ★后续复用：Embedding】
# 阶段2 会搬进 app/agents/rag_pipeline.py
# ============================================================
def embed_texts(texts: List[str]) -> np.ndarray:
    """批量调用向量化接口，返回 (n, dim) 的 float32 矩阵。"""
    if _client is None:
        raise RuntimeError("未配置 LLM_API_KEY 环境变量，无法向量化")
    resp = _client.embeddings.create(model=EMBED_MODEL, input=texts)
    vecs = np.array([d.embedding for d in resp.data], dtype="float32")
    # L2 归一化：归一化后内积 == 余弦相似度，检索更稳定
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    return vecs / np.clip(norms, 1e-10, None)


# ============================================================
# 【核心模块 ★后续复用：混合检索器】
# BM25（关键词）+ 向量（语义）双路召回 → 加权融合排序
# 阶段2 会搬进 app/agents/rag_pipeline.py，存储介质从 FAISS 换 pgvector
# ============================================================
class HybridRetriever:
    """混合检索器：BM25 精确匹配制度里的数字/条款 + 向量兜底语义变体问法。"""

    def __init__(self, chunks: List[str], alpha: float = 0.6):
        """
        alpha: 融合权重。alpha=0.6 表示向量得分占 60%，BM25 占 40%。
               制度文档含大量专有名词和数字，BM25 很重要，不宜给向量过高权重。
        """
        from rank_bm25 import BM25Okapi  # 延迟导入，加快启动

        self.chunks = chunks
        self.alpha = alpha
        # 中文分词：按单字切（jieba 效果更好，但阶段1保持零额外依赖）
        tokenized = [list(c) for c in chunks]
        self.bm25 = BM25Okapi(tokenized)
        # 向量化所有切片并构建 FAISS 索引（内积 = 余弦相似度）
        self.vecs = embed_texts(chunks)
        import faiss

        self.index = faiss.IndexFlatIP(self.vecs.shape[1])
        self.index.add(self.vecs)

    def search(self, query: str, top_k: int = 3) -> List[dict]:
        """双路检索 + 分数归一化融合，返回 top_k 个 {chunk, score}。"""
        # --- 路1：BM25 关键词检索 ---
        bm_scores = self.bm25.get_scores(list(query))  # 每个切片的 BM25 分
        bm_scores = bm_scores / (bm_scores.max() or 1.0)  # 归一化到 [0,1]

        # --- 路2：向量语义检索 ---
        q_vec = embed_texts([query])
        _, faiss_ids = self.index.search(q_vec, min(top_k, len(self.chunks)))
        vec_scores = np.zeros(len(self.chunks))
        for rank, idx in enumerate(faiss_ids[0]):
            if idx >= 0:
                # 按 FAISS 排名给衰减分数（rank1=1.0, rank2=0.8 ...）
                vec_scores[idx] = 1.0 - 0.2 * rank

        # --- 融合排序 ---
        final = self.alpha * vec_scores + (1 - self.alpha) * bm_scores
        top_idx = np.argsort(-final)[:top_k]
        return [
            {"chunk": self.chunks[i], "score": float(final[i])}
            for i in top_idx if final[i] > 0
        ]


# ============================================================
# 提示词模板（阶段2 会移到 app/agents/prompts/qa.yaml 单独管理）
# ============================================================
QA_PROMPT = """你是企业报销制度问答助手。请严格依据下方【参考制度】回答问题。

要求：
1. 只使用参考制度中的信息，不要编造制度里没有的规定
2. 回答末尾用【依据】标注引用了第几条制度片段
3. 如果参考制度中没有相关内容，直接回答"制度文档中未找到相关规定，请联系财务部确认"

【参考制度】
{context}

【员工问题】
{question}
"""


def main():
    parser = argparse.ArgumentParser(description="报销制度裸问答原型")
    parser.add_argument("policy_file", help="报销制度 markdown 文件路径")
    parser.add_argument("--dry-run", action="store_true", help="只测试检索链路，不调 LLM")
    args = parser.parse_args()

    # ---- 步骤1：读取并切片 ----
    with open(args.policy_file, "r", encoding="utf-8") as f:
        text = f.read()
    chunks = chunk_markdown(text)
    print(f"[初始化] 制度文档已切片：{len(chunks)} 块")

    # ---- 步骤2：构建混合检索索引 ----
    if not args.dry_run:
        retriever = HybridRetriever(chunks)
        print("[初始化] FAISS 向量索引 + BM25 索引构建完成")
    else:
        # dry-run 模式：跳过向量化，只用 BM25（便于无 Key 时验证流程）
        from rank_bm25 import BM25Okapi

        class BM25Only:
            def search(self, q, top_k=3):
                bm = BM25Okapi([list(c) for c in chunks])
                scores = bm.get_scores(list(q))
                idx = np.argsort(-scores)[:top_k]
                return [{"chunk": chunks[i], "score": float(scores[i])} for i in idx]

        retriever = BM25Only()
        print("[初始化] dry-run 模式：仅 BM25 检索")

    # ---- 步骤3：命令行问答循环 ----
    print("=" * 50)
    print("报销制度问答已就绪，输入问题开始（exit 退出）")
    print("=" * 50)
    while True:
        try:
            question = input("\n🧑 员工> ").strip()
        except (EOFError, KeyboardInterrupt):
            break
        if not question:
            continue
        if question.lower() in ("exit", "quit", "q"):
            break

        # 混合检索 top3
        hits = retriever.search(question, top_k=3)
        print("\n📎 检索到的制度片段：")
        for i, h in enumerate(hits, 1):
            preview = h["chunk"][:80].replace("\n", " ")
            print(f"  [{i}] (score={h['score']:.3f}) {preview}...")

        if args.dry_run:
            continue

        # 拼提示词 → 调 LLM
        context = "\n\n".join(
            f"制度片段{i}：{h['chunk']}" for i, h in enumerate(hits, 1)
        )
        answer = call_llm(
            [
                {"role": "system", "content": "你是严谨的企业报销制度助手"},
                {"role": "user", "content": QA_PROMPT.format(context=context, question=question)},
            ]
        )
        print(f"\n🤖 助手> {answer}")

    print("再见！")


if __name__ == "__main__":
    main()
