import { useApp } from '../store'
import type { ViewId } from '../store'
import { NEXT_QUESTIONS, STOP_CONDITIONS } from '../data/mock'
import { Card, Chip, StageChip } from '../components/ui'

const REQS: { id: string; title: string; ref: string; view: ViewId; done: string }[] = [
  {
    id: 'REQ-1',
    title: '以「数字逐项关联原文位置」作为草稿核心能力',
    ref: 'finance-f10 / f12 / f42 / f53',
    view: 'draft',
    done: '字段级引用、待核验标记、点击回原文'
  },
  {
    id: 'REQ-2',
    title: '异常兜底与人工分派闭环',
    ref: 'finance-f44 / f40 / f25 / f15',
    view: 'exceptions',
    done: 'MNPI 隔离、停止自动建议、具名分派与超时升级'
  },
  {
    id: 'REQ-3',
    title: '双审与审计留痕支持版本链重建',
    ref: 'finance-f41 / f45 / f01',
    view: 'audit',
    done: '版本链、建议内容、人工修正、签核人'
  },
  {
    id: 'REQ-4',
    title: '交接结构化携带必填资料与未解决事项',
    ref: 'finance-f23 / f14 / f50 / f54',
    view: 'handoff',
    done: '交接清单、必填校验、接手人确认'
  },
  {
    id: 'REQ-5',
    title: '模板区分实际值 / 共识值 / 差值并统一口径',
    ref: 'finance-f51 / f21 / f20 / f53',
    view: 'draft',
    done: '三值分列、口径来源与时间戳/单位校验'
  },
  {
    id: 'REQ-6',
    title: '收益基线与试点规模按人员分工重算',
    ref: 'finance-f22 / f20 / f03 / f53',
    view: 'pilot',
    done: '口径待固定标记、净成本归集、不承诺数值'
  }
]

const SOURCES_STATUS = [
  { name: 'Buyer · 业务决策者 Sarah', status: '已采集角色陈述，目标与预算仍待确认', tone: 'warn' as const },
  { name: 'Brief · 书面需求', status: '当前只有场景开场，书面 Brief 原文与版本待补', tone: 'danger' as const },
  { name: 'Industry · 行业可行性', status: '待补可比技术案例与本项目适用性验证', tone: 'danger' as const },
  { name: 'Operator · 一线使用者 Rachel', status: '已采集现场陈述，仍需样本与操作观察核实', tone: 'warn' as const }
]

export function DashboardView() {
  const { notes, exceptions, setView, selectedNoteId, selectNote } = useApp()
  const note = notes.find((n) => n.id === selectedNoteId) ?? notes[0]
  const fields = notes.flatMap((n) => n.fields)
  const openEx = exceptions.filter((e) => e.status !== 'resolved')

  return (
    <div className="content">
      <div className="grid grid-4">
        <Card>
          <div className="stat">
            <span className="n">{notes.length}</span>
            <span className="l">样例笔记（标准格式财报后一页）</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="n">{fields.length}</span>
            <span className="l">纳管字段（每个都需绑定原文位置）</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="n">{openEx.length}</span>
            <span className="l">未关闭异常单（P0 {openEx.filter((e) => e.severity === 'P0').length}）</span>
          </div>
        </Card>
        <Card>
          <div className="stat">
            <span className="n">
              {fields.filter((f) => f.status === 'ok').length}/{fields.length}
            </span>
            <span className="l">可发送字段 · 硬门槛 ≥18/20 样稿</span>
          </div>
        </Card>
      </div>

      <Card
        title={`当前笔记：${note.company} ${note.period}`}
        sub={`${note.bizNo} · 模板 ${note.templateVersion} · 最后同步 ${note.lastSyncedAt}`}
        right={
          <div className="row">
            <StageChip stage={note.stage} />
            <button className="btn sm" onClick={() => setView('draft')}>
              打开草稿核对
            </button>
          </div>
        }
      >
        <div className="row" style={{ gap: 10 }}>
          {notes.map((n) => (
            <button
              key={n.id}
              className={`note-tab ${n.id === note.id ? 'active' : ''}`}
              onClick={() => selectNote(n.id)}
            >
              {n.ticker} · {n.stage === 'blocked' ? '已阻断' : n.stage === 'handoff' ? '待/已交接' : '进行中'}
            </button>
          ))}
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          可确认的瓶颈不在「生成摘要」，而在数字与原文逐项核对、异常分派与双审交接。切入点优先「带原文位置的可追溯草稿 + 异常人工兜底」，
          发布与交易接口均属不可逆风险边界。
        </div>
      </Card>

      <Card title="本原型覆盖的需求（来自发现报告）" sub="P0/P1 仅为候选优先级，不等于已完成价值风险评分">
        <div className="grid grid-3">
          {REQS.map((r) => (
            <div className="metric-row" key={r.id}>
              <div className="row between">
                <b>
                  <Chip tone="solid">{r.id}</Chip> {r.title}
                </b>
              </div>
              <div className="small muted">依据：{r.ref}</div>
              <div className="small" style={{ color: '#334155' }}>
                原型实现：{r.done}
              </div>
              <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setView(r.view)}>
                查看
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="四来源核对状态" sub="调查覆盖 36/36 不等于四来源收敛；覆盖率不代表验收通过">
          <table className="table">
            <thead>
              <tr>
                <th>视角</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES_STATUS.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>
                    <Chip tone={s.tone}>{s.status}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="停止条件与风险边界" sub="虚构数字流入交易决策、或 MNPI 进入模型即终止试点">
          <ul className="stoplist">
            {STOP_CONDITIONS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <div className="hint" style={{ marginTop: 10 }}>
            研究侧只生成草稿，不能访问交易下单接口；不可逆动作前设置确定性校验（finance-f32）。
          </div>
        </Card>
      </div>

      <Card title="建议继续追问（报告中未核实项）" sub="这些决定隔离强度、责任归属与试点口径，必须先人工确认">
        <ul className="stoplist">
          {NEXT_QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
