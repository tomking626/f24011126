import { useState } from 'react'
import { useApp } from '../store'
import { roleById } from '../data/mock'
import { Card, Chip, StageChip } from '../components/ui'
import type { AuditEntry } from '../types'

const FLOW = ['研究草稿（AI）', '分析师复核', '合规审批', '交易侧接收']

function flowIndex(stage: string) {
  switch (stage) {
    case 'draft':
      return 0
    case 'analyst_review':
      return 1
    case 'compliance_review':
      return 2
    case 'handoff':
      return 3
    default:
      return 1
  }
}

export function AuditView() {
  const { notes, selectedNoteId, audit, can, complianceApprove, complianceReject, roleId } = useApp()
  const note = notes.find((n) => n.id === selectedNoteId) ?? notes[0]
  const entries = audit.filter((a) => a.noteId === note.id).sort((a, b) => a.version - b.version)
  const [rejectReason, setRejectReason] = useState('')
  const blocked = note.stage === 'blocked'
  const idx = blocked ? -1 : flowIndex(note.stage)

  const checks = deriveAuditChecks(entries)

  return (
    <div className="content">
      <Card title="发布流程（不可自动发布）" sub="研究草稿 → 分析师复核 → 合规审批 → 交易侧接收（finance-f01）">
        <div className="flow">
          {FLOW.map((f, i) => {
            const cls = blocked && i <= 1 ? 'blocked' : i < idx ? 'done' : i === idx ? 'active' : ''
            return (
              <span key={f} className="row" style={{ gap: 8 }}>
                <span className={`node ${cls}`}>
                  {f}
                  {blocked && i === 1 ? ' · 已阻断' : ''}
                </span>
                {i < FLOW.length - 1 && <span className="arrow">→</span>}
              </span>
            )
          })}
          <div className="spacer" />
          <StageChip stage={note.stage} />
        </div>
        <div className="hint" style={{ marginTop: 10 }}>
          草稿仅为起点，复核与审批两道人工关口不会因为工具而消失；不得出现仓位建议或并购猜测（finance-f41）。
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="版本链（可重建当次处理）" sub="保留资料版本、建议内容、人工修正与签核人；不是只留最终稿（finance-f45）">
          {entries.length === 0 && <div className="hint">暂无版本记录。</div>}
          <ul className="timeline">
            {entries.map((e) => (
              <li key={e.id} className={`tl-item ${toneOf(e)}`}>
                <div className="tl-head">
                  <span className="tl-title">
                    v{e.version} · {e.action}
                  </span>
                  <Chip>{roleById(e.actor).name}</Chip>
                  {e.signer && <Chip tone="purple">签核：{roleById(e.signer).name}</Chip>}
                  <span className="small muted mono">{e.at}</span>
                </div>
                <div className="tl-body">{e.detail}</div>
                {e.contentRef && (
                  <div className="small muted" style={{ marginTop: 3 }}>
                    内容：{e.contentRef}
                  </div>
                )}
                {e.correctionReason && (
                  <div className="small" style={{ color: '#b45309', marginTop: 3 }}>
                    修正原因：{e.correctionReason}
                  </div>
                )}
                <div className="tl-refs">
                  {e.sourceVersionRefs.map((s) => (
                    <span key={s.docName + s.version}>
                      ↳ 引用 {s.docName} · {s.version}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid" style={{ gap: 14 }}>
          <Card title="合规双审" sub="分析师与合规共同审核，双审记录留痕，不是任一方单独放行（finance-f41）">
            <div className="row" style={{ marginBottom: 8 }}>
              <Chip tone={note.stage === 'handoff' ? 'ok' : 'default'}>分析师复核：{['handoff', 'compliance_review'].includes(note.stage) ? '已提交' : '未完成'}</Chip>
              <Chip tone={note.stage === 'handoff' ? 'ok' : 'default'}>合规审批：{note.stage === 'handoff' ? '已通过' : '未通过'}</Chip>
            </div>
            <div className="row">
              <button className="btn primary" disabled={!can('note.dualReview.compliance')} onClick={() => complianceApprove(note.id)}>
                合规双审通过
              </button>
              <button
                className="btn danger"
                disabled={!can('note.dualReview.compliance') || rejectReason.trim().length === 0}
                onClick={() => complianceReject(note.id, rejectReason)}
              >
                合规否决
              </button>
            </div>
            {!can('note.dualReview.compliance') && (
              <div className="perm-note" style={{ marginTop: 6 }}>
                仅合规官 Mei 可执行双审放行 / 否决。
              </div>
            )}
            <div className="inline-form">
              <div className="form-row">
                <label>否决原因（必填）</label>
                <textarea
                  className="textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="例如：存在重大非公开信息且存在缺引用项，停止自动建议，不予放行"
                />
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 8 }}>
              当前角色：{roleById(roleId).name}。
            </p>
          </Card>

          <Card title="审计能力核验" sub="对照 Mei 的审计凭证要求逐项检查">
            <table className="table">
              <thead>
                <tr>
                  <th>审计要求</th>
                  <th>结果</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.label}>
                    <td>{c.label}</td>
                    <td>
                      {c.pass ? <Chip tone="ok">满足</Chip> : <Chip tone="warn">待核实</Chip>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted" style={{ marginTop: 8 }}>
              尚未核实：修正是否强制填原因、版本链在现有系统中如何呈现、谁能查看完整日志（finance-r4）。
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function toneOf(e: AuditEntry): string {
  if (e.action === '合规否决' || e.action === '发布拦截') return 'reject'
  if (e.action === '合规双审通过' || e.action === '交接确认') return 'approve'
  if (e.action === '异常隔离') return 'isolate'
  return ''
}

function deriveAuditChecks(entries: AuditEntry[]) {
  return [
    { label: '保留建议内容（非仅最终稿）', pass: entries.some((e) => e.action === '草稿生成') },
    { label: '保留人工修正与修正原因', pass: entries.some((e) => e.action === '人工修正') },
    { label: '保留签核人', pass: entries.some((e) => !!e.signer) },
    { label: '保留资料版本引用', pass: entries.every((e) => e.sourceVersionRefs.length > 0) },
    { label: '不记录口令或非必要个人信息', pass: entries.every((e) => !e.containsPII) },
    { label: '可从最终稿回溯到原建议', pass: entries.length > 1 }
  ]
}
