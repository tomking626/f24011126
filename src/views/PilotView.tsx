import { useApp } from '../store'
import type { ViewId } from '../store'
import { COST_LINES, PILOT_BUDGET, SCOPE_BOUNDARIES, STOP_CONDITIONS } from '../data/mock'
import { Card, Chip } from '../components/ui'
import { roleById } from '../data/mock'

export function PilotView() {
  const { metrics, can, fixBasis, notes } = useApp()
  const totalCost = COST_LINES.reduce((s, c) => s + (c.excludedFromSaving ? 0 : c.amount ?? 0), 0)
  const totalFields = notes.reduce((s, n) => s + n.fields.length, 0)

  return (
    <div className="content">
      <Card
        title="试点度量与收益口径"
        sub="收益基线与试点规模须按人员分工重算，不能沿用「每人 1280 小时」口径（finance-f22）；无样本前不承诺节省额"
        right={<Chip tone="info">合成试点预算 {PILOT_BUDGET.toLocaleString()} 元等值</Chip>}
      >
        <div className="grid grid-3">
          {metrics.map((m) => (
            <div className="metric-row" key={m.key}>
              <div className="row between">
                <b>{m.label}</b>
                {m.basisFixed ? <Chip tone="ok">口径已固定</Chip> : <Chip tone="warn">口径待固定</Chip>}
              </div>
              <div className="val">{m.value ?? '—'}</div>
              <div className="small muted">
                {m.value === null ? '无可用样本，不承诺数值' : ''}
              </div>
              <div className="bar">
                <span style={{ width: `${Math.min(100, (m.sampleCount / Math.max(1, m.sampleTarget)) * 100)}%` }} />
              </div>
              <div className="small muted">
                样本 {m.sampleCount}/{m.sampleTarget} · 口径负责人 {roleById(m.basisOwner).name}
              </div>
              <div className="small" style={{ color: '#475569' }}>
                {m.note}
              </div>
              <button
                className="btn sm"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                disabled={!can('pilot.defineBaseline') || m.basisFixed}
                onClick={() => fixBasis(m.key)}
              >
                由业务负责人固定口径
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="成本归集（净收益口径）" sub="预算需扣除接口、培训、复核与维护成本；既有系统采购不纳入节省额（finance-f03）">
          <table className="table">
            <thead>
              <tr>
                <th>科目</th>
                <th>金额（元）</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              {COST_LINES.map((c) => (
                <tr key={c.key}>
                  <td>
                    {c.label}
                    {c.excludedFromSaving && (
                      <div>
                        <Chip tone="warn">不计入节省额</Chip>
                      </div>
                    )}
                  </td>
                  <td className="mono">{c.amount === null ? '—' : c.amount.toLocaleString()}</td>
                  <td className="small muted">{c.note}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <b>合计（可归集成本）</b>
                </td>
                <td className="mono">
                  <b>{totalCost.toLocaleString()}</b>
                </td>
                <td className="small muted">占预算 {((totalCost / PILOT_BUDGET) * 100).toFixed(0)}%</td>
              </tr>
            </tbody>
          </table>
          <div className="hint" style={{ marginTop: 10 }}>
            当前已纳管字段 {totalFields} 个（3 份样例笔记）；单量与耗时样本仍缺，收益无法量化。
          </div>
        </Card>

        <Card title="基线口径说明" sub="对照 David 的核验口径与 Sarah 的立项口径">
          <ul className="stoplist">
            <li>覆盖基线：约 80 家公司 × 5 名资深分析师，属团队总量，不能直接摊到人（finance-f20 / f22）。</li>
            <li>复核时长：4 小时 → 30 分钟为复核单份笔记口径，是否含异常处理尚未核实（finance-f13）。</li>
            <li>可发送门槛：20 份样稿至少 18 份可发送，所有数字带原文依据；分母、统计周期与排除规则须由业务负责人固定（finance-f12 / f53）。</li>
            <li>不得用消息发送量代替实际完成量（finance-f53）。</li>
          </ul>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="停止条件（触发即终止试点）" sub="不是扣分项（finance-f02）">
          <ul className="stoplist">
            {STOP_CONDITIONS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
        <Card title="首期范围边界" sub="先历史回放、再并行试点，不关停现有人工流程（finance-f05）">
          <ul className="stoplist">
            {SCOPE_BOUNDARIES.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="hint">
        说明：本页所有数值来自合成试点材料；未核实项（单量、耗时分布、双审通过率、反馈受理时效）一律留空并标注，不以估算值代替。
      </div>
    </div>
  )
}
