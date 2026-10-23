import { useApp } from '../store'
import { roleById } from '../data/mock'
import { Card, Chip } from '../components/ui'

export function HandoffView() {
  const { notes, selectedNoteId, handoffs, confirmHandoff, can, roleId } = useApp()
  const note = notes.find((n) => n.id === selectedNoteId) ?? notes[0]
  const h = handoffs.find((x) => x.noteId === note.id)

  if (!h) {
    return (
      <div className="content">
        <Card title="结构化交接" sub="该笔记尚未生成交接清单">
          <div className="hint">
            交接必须结构化携带财报原文、历史笔记、共识快照、发布审批记录、当前版本与未解决事项；
            接手人明确确认后才结束本岗待办，发送消息不等于责任转移（finance-f23）。
          </div>
        </Card>
      </div>
    )
  }

  const missing = h.fields.filter((f) => f.required && !f.provided)

  return (
    <div className="content">
      <Card
        title={`交接清单 · ${h.bizNo}`}
        sub={`${roleById(h.from).name} → ${roleById(h.to).name} · 发送消息不等于责任转移（finance-f23）`}
        right={
          h.status === 'confirmed' ? (
            <Chip tone="ok">已交接 · {h.confirmedAt}</Chip>
          ) : (
            <Chip tone="warn">待接手人确认</Chip>
          )
        }
        bodyPad={false}
      >
        <table className="table">
          <thead>
            <tr>
              <th>交接字段</th>
              <th>必填</th>
              <th>内容</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {h.fields.map((f) => (
              <tr key={f.key}>
                <td>{f.label}</td>
                <td>{f.required ? <Chip tone="info">必填</Chip> : <Chip>选填</Chip>}</td>
                <td className="small">{f.value ?? '—'}</td>
                <td>
                  {f.required && !f.provided ? <Chip tone="danger">缺失</Chip> : <Chip tone="ok">已提供</Chip>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="card-body">
          {missing.length > 0 && (
            <div className="hint" style={{ marginBottom: 10 }}>
              缺少必填项：{missing.map((m) => m.label).join('、')} → 不能完成交接。
            </div>
          )}
          <div className="row">
            <button
              className="btn primary"
              disabled={!can('handoff.confirm') || h.status === 'confirmed'}
              onClick={() => confirmHandoff(note.id, roleId)}
            >
              接手人确认（责任转移）
            </button>
            {!can('handoff.confirm') && <span className="perm-note">当前角色无交接确认权限。</span>}
            {h.status === 'confirmed' && (
              <span className="small muted">
                已由 {h.confirmedBy && roleById(h.confirmedBy).name} 于 {h.confirmedAt} 确认
              </span>
            )}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            只有接手人本人确认，责任才转移；当前接手人为 {roleById(h.to).name}。用当前角色点击可观察越权拦截。
          </p>
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="交接必须携带（David 口径）" sub="finance-f23 / finance-f21">
          <ul className="stoplist">
            <li>财报原文（含版本）</li>
            <li>历史笔记</li>
            <li>共识快照与发布审批记录</li>
            <li>当前版本与未解决事项</li>
            <li>每项资料源标注时间戳、单位与口径</li>
            <li>接手人明确确认后才结束本岗待办</li>
          </ul>
        </Card>

        <Card title="下游反馈受理（Carmen 口径）" sub="反馈必须关联原业务编号与当时的资料版本（finance-f54）">
          <table className="table">
            <thead>
              <tr>
                <th>必填字段</th>
                <th>说明</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>原业务编号</td>
                <td className="small muted">缺失则不受理，无法定位版本</td>
              </tr>
              <tr>
                <td>当时的资料版本</td>
                <td className="small muted">用于核对是否口径或版本问题</td>
              </tr>
              <tr>
                <td>受理人 / 核实人</td>
                <td className="small muted">Carmen 受理、David 核实；未确认前不承诺赔偿或结果</td>
              </tr>
            </tbody>
          </table>
          <div className="hint" style={{ marginTop: 10 }}>
            误判与未解决问题每周复盘，由 Sarah 指定改进负责人，复测「20 份样稿至少 18 份可发送」后才更新规则（finance-f55）。
          </div>
        </Card>
      </div>
    </div>
  )
}
