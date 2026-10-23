import { useState } from 'react'
import { useApp } from '../store'
import { ROLES, actorName, roleById } from '../data/mock'
import { Card, Chip, ExceptionStatusChip } from '../components/ui'
import { EXCEPTION_TYPE_LABEL } from '../types'
import type { RoleId } from '../types'

export function ExceptionsView() {
  const {
    notes,
    selectedNoteId,
    exceptions,
    selectedExceptionId,
    selectException,
    can,
    isolateException,
    dispatchException,
    resolveException,
    escalateException,
    roleId
  } = useApp()

  const [onlyCurrent, setOnlyCurrent] = useState(true)
  const note = notes.find((n) => n.id === selectedNoteId) ?? notes[0]
  const list = onlyCurrent ? exceptions.filter((e) => e.noteId === note.id) : exceptions
  const current = list.find((e) => e.id === selectedExceptionId) ?? list[0] ?? null

  const [assignee, setAssignee] = useState<RoleId>('rachel')
  const [deadline, setDeadline] = useState('2026-10-23 18:00')
  const [returnReason, setReturnReason] = useState('')
  const [resolveDetail, setResolveDetail] = useState('')

  return (
    <div className="content">
      <Card
        title="异常兜底与人工分派闭环"
        sub="重大非公开信息 / 数字缺引用 / 原始口径不一致 / 依据缺失 / 关键系统不可用 → 停止自动建议，标明原因、接手人及人工确认时间（finance-f44）"
        right={
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={onlyCurrent} onChange={(e) => setOnlyCurrent(e.target.checked)} />
            仅当前笔记（{note.ticker}）
          </label>
        }
        bodyPad={false}
      >
        <div className="review" style={{ padding: 16 }}>
          <div>
            <table className="table">
              <thead>
                <tr>
                  <th>异常编号</th>
                  <th>类型</th>
                  <th>级别</th>
                  <th>处理人</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr
                    key={e.id}
                    className={`clickable ${e.id === (current?.id ?? '') ? 'sel' : ''}`}
                    onClick={() => selectException(e.id)}
                  >
                    <td className="mono small">
                      {e.id}
                      <div className="tiny muted">{e.bizNo}</div>
                    </td>
                    <td>
                      {EXCEPTION_TYPE_LABEL[e.type]}
                      {e.type === 'MNPI' && (
                        <div>
                          <Chip tone="purple">已隔离 · 未进模型上下文</Chip>
                        </div>
                      )}
                    </td>
                    <td>
                      <Chip tone={e.severity === 'P0' ? 'danger' : 'warn'}>{e.severity}</Chip>
                    </td>
                    <td className="small">{e.assignee ? roleById(e.assignee).name : <span className="muted">待分派</span>}</td>
                    <td>
                      <ExceptionStatusChip status={e.status} />
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="muted small">
                      该笔记暂无异常单
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            {!current && <div className="hint">选择左侧异常单查看处理路径。</div>}
            {current && (
              <Card title={`异常详情 · ${current.id}`} sub={`业务编号 ${current.bizNo}`}>
                <div className="row between">
                  <Chip tone={current.severity === 'P0' ? 'danger' : 'warn'}>{current.severity}</Chip>
                  <ExceptionStatusChip status={current.status} />
                </div>
                <div className="hint" style={{ marginTop: 10 }}>
                  触发原因：{current.reason}
                </div>

                <div className="kv" style={{ marginTop: 10, flexDirection: 'column', gap: 4 }}>
                  <span>
                    自动建议：<b>{current.autoSuggestionStopped ? '已停止' : '正常运行'}</b>
                  </span>
                  <span>
                    隔离：<b>{current.isolated ? '已隔离，未进入模型上下文' : '未隔离'}</b>
                  </span>
                  <span>
                    人工确认时间：<b className="mono">{current.confirmTime ?? '—'}</b>
                  </span>
                  <span>
                    截止时间：<b className="mono">{current.deadline ?? '—'}</b>
                  </span>
                  <span>
                    携带原文片段：<b>{current.carriesSourceSnippet ? '是' : '否'}</b>
                  </span>
                  <span>
                    关联资料版本：<b>{current.sourceVersionRef ?? '—'}</b>
                  </span>
                  {current.escalatedTo && (
                    <span>
                      升级至：<b>{roleById(current.escalatedTo).name}</b>（超时协调）
                    </span>
                  )}
                </div>

                {current.returnReason && (
                  <div className="hint" style={{ marginTop: 8 }}>
                    退回原因：{current.returnReason}
                  </div>
                )}

                {current.status !== 'resolved' && (
                  <div className="inline-form">
                    <div className="form-row">
                      <label>隔离（MNPI 红线：先隔离再交接，不进模型上下文）</label>
                    </div>
                    <button
                      className="btn danger"
                      disabled={!can('exception.isolate') || current.isolated}
                      onClick={() => isolateException(current.id)}
                    >
                      停止自动建议并隔离
                    </button>
                    {!can('exception.isolate') && (
                      <div className="perm-note" style={{ marginTop: 6 }}>
                        仅合规官 Mei 可执行隔离。
                      </div>
                    )}
                  </div>
                )}

                <div className="inline-form">
                  <div className="form-row">
                    <label>分派（须写明处理人、截止时间、退回原因，不能只改状态）</label>
                  </div>
                  <div className="form-row">
                    <select className="select" value={assignee} onChange={(e) => setAssignee(e.target.value as RoleId)}>
                      {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} · {r.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-row">
                    <input className="input" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                  </div>
                  <div className="form-row">
                    <textarea
                      className="textarea"
                      placeholder="退回原因（例如：缺引用，不得用猜测值补齐）"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                    />
                  </div>
                  <button
                    className="btn primary"
                    disabled={!can('exception.dispatch') || returnReason.trim().length === 0}
                    onClick={() => dispatchException(current.id, assignee, deadline, returnReason)}
                  >
                    分派异常
                  </button>
                  {!can('exception.dispatch') && (
                    <div className="perm-note" style={{ marginTop: 6 }}>
                      仅研究负责人 David 可分派。
                    </div>
                  )}
                </div>

                {current.status !== 'resolved' && (
                  <div className="inline-form">
                    <div className="form-row">
                      <label>关闭异常（记录处理路径）</label>
                    </div>
                    <div className="form-row">
                      <textarea
                        className="textarea"
                        placeholder="例如：已补回原文位置并重新核验；口径按开票口径登记版本"
                        value={resolveDetail}
                        onChange={(e) => setResolveDetail(e.target.value)}
                      />
                    </div>
                    <button
                      className="btn"
                      disabled={!can('exception.resolve') || resolveDetail.trim().length === 0}
                      onClick={() => resolveException(current.id, resolveDetail)}
                    >
                      关闭异常
                    </button>
                  </div>
                )}

                <button
                  className="btn ghost sm"
                  style={{ marginTop: 8 }}
                  disabled={current.status === 'escalated'}
                  onClick={() => escalateException(current.id)}
                >
                  模拟超时 → 升级至 Sarah 协调
                </button>
              </Card>
            )}
          </div>
        </div>
      </Card>

      <Card title="处理历史（留痕）" sub="每次动作写入异常单与审核日志">
        {current ? (
          <ul className="timeline">
            {current.history.map((h, i) => (
              <li className="tl-item" key={i}>
                <div className="tl-head">
                  <span className="tl-title">{h.action}</span>
                  <Chip>{actorName(h.actor)}</Chip>
                  <span className="small muted mono">{h.at}</span>
                </div>
                <div className="tl-body">{h.detail}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="hint">暂无选中异常单。</div>
        )}
      </Card>

      <div className="hint">
        当前角色：{roleById(roleId).name}。兜底触发后由 Rachel 直接接手还是先经 David 分派，尚未核实；MNPI 不得进入模型上下文，研究与交易侧须保持隔离（finance-f40 / finance-r4）。
      </div>
    </div>
  )
}
