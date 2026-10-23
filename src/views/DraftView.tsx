import { useMemo, useState } from 'react'
import { useApp } from '../store'
import { SOURCES, sourceById } from '../data/mock'
import { Card, Chip, FieldStatusChip, KindBadge, KV, Legend, StageChip } from '../components/ui'
import type { NoteField } from '../types'

export function DraftView() {
  const {
    notes,
    selectedNoteId,
    selectedFieldId,
    selectField,
    can,
    linkSource,
    correctField,
    submitNote,
    roleId
  } = useApp()
  const note = notes.find((n) => n.id === selectedNoteId) ?? notes[0]
  const field: NoteField | null = note.fields.find((f) => f.id === selectedFieldId) ?? null

  const candidates = useMemo(
    () => SOURCES.filter((s) => s.masterId.startsWith(note.ticker) || s.docName.includes(note.company)),
    [note.ticker, note.company]
  )

  const [linkPick, setLinkPick] = useState<string>(candidates[0]?.id ?? '')
  const [fixValue, setFixValue] = useState('')
  const [fixReason, setFixReason] = useState('')

  const bad = note.fields.filter((f) => f.status !== 'ok')

  return (
    <div className="content">
      <Card
        title="带来源的研究草稿 —— 数字与原文逐项核对"
        sub="核心能力不是流畅摘要，而是每个数字都绑定原文位置；缺引用一律标「待核验」，不输出猜测值（finance-f10 / f12 / f42）"
        right={
          <div className="row">
            <StageChip stage={note.stage} />
            {bad.length > 0 && <Chip tone="danger">{bad.length} 处待处理</Chip>}
          </div>
        }
        bodyPad={false}
      >
        <div style={{ padding: '12px 16px 0' }}>
          <Legend />
        </div>
        <div className="review" style={{ padding: 16 }}>
          {/* 左：字段清单 */}
          <div>
            <div className="row between" style={{ marginBottom: 8 }}>
              <b>
                {note.company} {note.period} 一页笔记 · {note.fields.length} 个字段
              </b>
              <span className="small muted">模板 {note.templateVersion}</span>
            </div>
            <div className="card" style={{ boxShadow: 'none' }}>
              <div className="field-row head">
                <span>字段</span>
                <span>类型</span>
                <span>数值</span>
                <span>口径来源</span>
                <span>状态</span>
              </div>
              {note.fields.map((f) => (
                <div
                  key={f.id}
                  className={`field-row clickable ${f.status !== 'ok' ? f.status : ''} ${
                    f.id === selectedFieldId ? 'sel' : ''
                  }`}
                  onClick={() => {
                    selectField(f.id)
                    setFixValue(f.value)
                    setFixReason('')
                  }}
                >
                  <span className="field-label">
                    {f.label}
                    {f.corrected && (
                      <Chip tone="info">
                        <span className="dot" /> 已人工修正
                      </Chip>
                    )}
                  </span>
                  <span>
                    <KindBadge kind={f.kind} />
                  </span>
                  <span className="field-value mono">
                    {f.value} <span className="tiny muted">{f.unit}</span>
                  </span>
                  <span className="small muted">{f.basis}</span>
                  <span>
                    <FieldStatusChip status={f.status} />
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <Card
                title="财报 Q&A 指引变化（高频漏点，单独标出）"
                sub="指引变化极易被整段跳过，须逐条标出并绑定原文（finance-f11）"
              >
                <table className="table">
                  <thead>
                    <tr>
                      <th>主题</th>
                      <th>变化</th>
                      <th>原文位置</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {note.guidanceChanges.map((g) => {
                      const s = sourceById(g.sourceId)
                      return (
                        <tr key={g.id}>
                          <td>{g.topic}</td>
                          <td>{g.text}</td>
                          <td className="small muted">
                            {s ? `${s.docName} · ${s.location}` : '—'}
                          </td>
                          <td>
                            {g.flagged ? (
                              <Chip tone="danger">已拦截</Chip>
                            ) : g.changed ? (
                              <Chip tone="warn">指引已变化</Chip>
                            ) : (
                              <Chip tone="ok">未变化</Chip>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>

          {/* 右：原文片段与动作 */}
          <div>
            <Card title="关联原文位置" sub="每条辅助结果必须显示原记录，逐项对回原文（finance-f15）">
              {!field && <div className="hint">在左侧点击任意字段，查看其关联的原文片段。</div>}

              {field && (
                <>
                  <div className="row between" style={{ marginBottom: 8 }}>
                    <b>{field.label}</b>
                    <FieldStatusChip status={field.status} />
                  </div>
                  <KV
                    items={[
                      { k: '数值', v: <span className="mono">{`${field.value} ${field.unit}`}</span> },
                      { k: '类型', v: field.kind },
                      { k: '口径', v: field.basis }
                    ]}
                  />

                  {field.note && (
                    <div className="hint" style={{ marginTop: 8 }}>
                      {field.note}
                    </div>
                  )}
                  {field.corrected && field.correctionReason && (
                    <div className="hint" style={{ marginTop: 8 }}>
                      人工修正原因：{field.correctionReason}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    {field.sourceIds.length === 0 && (
                      <div className="hint">该字段尚未关联任何原文片段 → 缺引用。</div>
                    )}
                    {field.sourceIds.map((sid) => {
                      const s = sourceById(sid)
                      if (!s) return null
                      return (
                        <div key={sid} className={`source-card ${s.stale ? 'stale' : ''}`}>
                          <div className="row between">
                            <Chip tone="info">{s.docType}</Chip>
                            {s.stale && <Chip tone="warn">快照已过期 · 待刷新</Chip>}
                          </div>
                          <div style={{ fontWeight: 600, marginTop: 6 }}>{s.docName}</div>
                          <div className="small muted">
                            {s.location} · {s.version}
                          </div>
                          <p className="quote">{s.quote}</p>
                          <div className="kv" style={{ marginTop: 6 }}>
                            <span>
                              事件时间 <b className="mono">{s.eventTime}</b>
                            </span>
                            <span>
                              单位 <b>{s.unit}</b>
                            </span>
                            <span>
                              口径 <b>{s.basis}</b>
                            </span>
                            <span>
                              主编号 <b className="mono">{s.masterId}</b>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 动作 */}
                  {field.status !== 'ok' && (
                    <div className="inline-form">
                      <div className="form-row">
                        <label>关联原文位置（补回引用后重新核验）</label>
                        <select className="select" value={linkPick} onChange={(e) => setLinkPick(e.target.value)}>
                          {candidates.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.docType} · {s.docName} · {s.location}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="btn primary"
                        disabled={!can('note.verifySource')}
                        onClick={() => linkSource(note.id, field.id, linkPick)}
                      >
                        补回原文位置
                      </button>
                      {!can('note.verifySource') && (
                        <div className="perm-note" style={{ marginTop: 6 }}>
                          当前角色（{roleId}）无「逐项核对来源」权限，仅 {`Rachel`} 可执行。
                        </div>
                      )}
                    </div>
                  )}

                  <div className="inline-form">
                    <div className="form-row">
                      <label>人工修正数值</label>
                      <input
                        className="input"
                        value={fixValue}
                        onChange={(e) => setFixValue(e.target.value)}
                        placeholder="输入修正后的值"
                      />
                    </div>
                    <div className="form-row">
                      <label>修正原因（必填 · 写入版本链）</label>
                      <textarea
                        className="textarea"
                        value={fixReason}
                        onChange={(e) => setFixReason(e.target.value)}
                        placeholder="例如：与 10-Q 原文不符，逐项回原文核"
                      />
                    </div>
                    <button
                      className="btn"
                      disabled={!can('note.editField') || fixReason.trim().length === 0}
                      onClick={() => correctField(note.id, field.id, fixValue, fixReason)}
                    >
                      记录人工修正
                    </button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </Card>

      <div className="grid grid-2">
        <Card title="草稿生成所依据的资料版本快照" sub="审计须能重建当次处理（finance-f45）">
          <table className="table">
            <thead>
              <tr>
                <th>资料源</th>
                <th>版本</th>
              </tr>
            </thead>
            <tbody>
              {note.sourceSnapshot.map((s) => (
                <tr key={s.docName}>
                  <td>{s.docName}</td>
                  <td className="mono small">{s.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title="提交复核" sub="草稿只是起点：研究草稿 → 分析师复核 → 合规审批 → 交易侧接收（finance-f01）">
          <ul className="stoplist">
            <li>所有数字已关联原文位置：{note.fields.filter((f) => f.sourceIds.length > 0).length}/{note.fields.length}</li>
            <li>待核验 / 已拦截：{bad.length} 处</li>
            <li>自动建议状态：{note.autoSuggestionStopped ? '已停止（存在异常）' : '运行中'}</li>
          </ul>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={!can('note.submit')} onClick={() => submitNote(note.id)}>
              提交分析师复核
            </button>
            {!can('note.submit') && <span className="perm-note">当前角色无提交权限（仅分析师）。</span>}
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>
            未披露的指标不能由模型补全；发现错误不得覆盖原记录，须走人工修正并留痕（finance-f11 / f15）。
          </p>
        </Card>
      </div>
    </div>
  )
}
