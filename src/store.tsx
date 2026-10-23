import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type {
  AuditAction,
  AuditEntry,
  ExceptionCase,
  Handoff,
  Permission,
  ResearchNote,
  RoleId
} from './types'
import {
  AUDIT,
  EXCEPTIONS,
  HANDOFFS,
  NOTES,
  PILOT_METRICS,
  roleById
} from './data/mock'

export type ViewId =
  | 'dashboard'
  | 'draft'
  | 'exceptions'
  | 'audit'
  | 'handoff'
  | 'pilot'
  | 'scope'

interface Toast {
  id: number
  kind: 'ok' | 'warn' | 'block'
  text: string
}

interface AppState {
  roleId: RoleId
  view: ViewId
  selectedNoteId: string
  selectedFieldId: string | null
  selectedExceptionId: string | null
  notes: ResearchNote[]
  exceptions: ExceptionCase[]
  audit: AuditEntry[]
  handoffs: Handoff[]
  metrics: typeof PILOT_METRICS
  toasts: Toast[]
}

interface AppActions {
  setRole: (id: RoleId) => void
  setView: (v: ViewId) => void
  selectNote: (id: string) => void
  selectField: (id: string | null) => void
  selectException: (id: string | null) => void
  can: (p: Permission) => boolean
  toast: (kind: Toast['kind'], text: string) => void
  dismissToast: (id: number) => void
  /** 一线：为缺引用字段关联原文位置（REQ-1） */
  linkSource: (noteId: string, fieldId: string, sourceId: string) => void
  /** 一线：人工修正字段，必须填原因（REQ-3） */
  correctField: (noteId: string, fieldId: string, newValue: string, reason: string) => void
  /** 分析师：提交复核 */
  submitNote: (noteId: string) => void
  /** 合规：双审通过 / 否决 */
  complianceApprove: (noteId: string) => void
  complianceReject: (noteId: string, reason: string) => void
  /** 异常：隔离 / 分派 / 关闭 / 升级 */
  isolateException: (id: string) => void
  dispatchException: (id: string, assignee: RoleId, deadline: string, returnReason: string) => void
  resolveException: (id: string, detail: string) => void
  escalateException: (id: string) => void
  /** 交接：接手人确认 */
  confirmHandoff: (noteId: string, by: RoleId) => void
  /** 口径：业务负责人固定基线口径 */
  fixBasis: (metricKey: string) => void
}

const AppContext = createContext<(AppState & AppActions) | null>(null)

let toastSeq = 1
let auditSeq = 100

const APPROVALS: Record<string, string[]> = {}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [roleId, setRoleId] = useState<RoleId>('rachel')
  const [view, setView] = useState<ViewId>('dashboard')
  const [selectedNoteId, setSelectedNoteId] = useState<string>(NOTES[0].id)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null)
  const [notes, setNotes] = useState<ResearchNote[]>(() => deepClone(NOTES))
  const [exceptions, setExceptions] = useState<ExceptionCase[]>(() => deepClone(EXCEPTIONS))
  const [audit, setAudit] = useState<AuditEntry[]>(() => deepClone(AUDIT))
  const [handoffs, setHandoffs] = useState<Handoff[]>(() => deepClone(HANDOFFS))
  const [metrics, setMetrics] = useState(() => deepClone(PILOT_METRICS))
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((kind: Toast['kind'], text: string) => {
    const id = toastSeq++
    setToasts((t) => [...t, { id, kind, text }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const can = useCallback(
    (p: Permission) => roleById(roleId).permissions.includes(p),
    [roleId]
  )

  const appendAudit = useCallback(
    (
      noteId: string,
      actor: RoleId,
      action: AuditAction,
      detail: string,
      extra: Partial<AuditEntry> = {}
    ) => {
      const note = notes.find((n) => n.id === noteId)
      const bizNo = note?.bizNo ?? '—'
      const prev = audit.filter((a) => a.noteId === noteId)
      const version = prev.reduce((m, a) => Math.max(m, a.version), 0) + 1
      const entry: AuditEntry = {
        id: `au-${auditSeq++}`,
        noteId,
        bizNo,
        version,
        at: nowStamp(),
        actor,
        action,
        detail,
        sourceVersionRefs: note?.sourceSnapshot ?? [],
        containsPII: false,
        ...extra
      }
      setAudit((a) => [...a, entry])
    },
    [audit, notes]
  )

  const updateNote = useCallback((noteId: string, fn: (n: ResearchNote) => ResearchNote) => {
    setNotes((list) => list.map((n) => (n.id === noteId ? fn(n) : n)))
  }, [])

  const linkSource = useCallback(
    (noteId: string, fieldId: string, sourceId: string) => {
      updateNote(noteId, (n) => ({
        ...n,
        fields: n.fields.map((f) =>
          f.id === fieldId
            ? {
                ...f,
                sourceIds: f.sourceIds.includes(sourceId) ? f.sourceIds : [...f.sourceIds, sourceId],
                status: 'ok',
                note: '已补回原文位置，重新核验通过 [finance-f42]'
              }
            : f
        )
      }))
      appendAudit(noteId, roleId, '人工修正', `为字段关联原文位置：${sourceId}`, {
        contentRef: `字段 ${fieldId} ← ${sourceId}`,
        correctionReason: '缺引用补回原文位置'
      })
      toast('ok', '已关联原文位置，该字段重新核验通过')
    },
    [appendAudit, roleId, toast, updateNote]
  )

  const correctField = useCallback(
    (noteId: string, fieldId: string, newValue: string, reason: string) => {
      updateNote(noteId, (n) => ({
        ...n,
        fields: n.fields.map((f) =>
          f.id === fieldId ? { ...f, value: newValue, corrected: true, correctionReason: reason } : f
        )
      }))
      appendAudit(noteId, roleId, '人工修正', `修正字段值：${fieldId}`, {
        contentRef: `${fieldId} → ${newValue}`,
        correctionReason: reason
      })
      toast('ok', '已记录人工修正，并写入版本链')
    },
    [appendAudit, roleId, toast, updateNote]
  )

  const submitNote = useCallback(
    (noteId: string) => {
      const n = notes.find((x) => x.id === noteId)
      if (!n) return
      const blocked = n.fields.filter((f) => f.status !== 'ok').length
      if (n.autoSuggestionStopped) {
        toast('block', '该笔记已停止自动建议，存在未关闭异常，不能提交发布环节')
        return
      }
      updateNote(noteId, (x) => ({ ...x, stage: 'compliance_review' }))
      appendAudit(noteId, roleId, '提交复核', `提交合规审批${blocked ? `（含 ${blocked} 处待核验，仅作复核用）` : ''}`)
      toast(blocked ? 'warn' : 'ok', blocked ? '已提交，但存在待核验项，合规不会放行' : '已提交合规审批')
    },
    [appendAudit, notes, roleId, toast, updateNote]
  )

  const complianceApprove = useCallback(
    (noteId: string) => {
      const n = notes.find((x) => x.id === noteId)
      if (!n) return
      const open = n.fields.filter((f) => f.status !== 'ok')
      if (open.length > 0) {
        toast('block', `存在 ${open.length} 处待核验 / 已拦截字段，不符合可追溯硬门槛，不予放行`)
        return
      }
      const isolated = exceptions.some((e) => e.noteId === noteId && e.type === 'MNPI' && e.isolated)
      if (isolated) {
        toast('block', '存在已隔离的重大非公开信息，研究与交易侧须保持隔离，不予放行')
        return
      }
      APPROVALS[noteId] = ['rachel', 'mei']
      updateNote(noteId, (x) => ({ ...x, stage: 'handoff' }))
      appendAudit(noteId, roleId, '合规双审通过', '分析师与合规共同审核完成，无仓位建议、无并购猜测', {
        signer: 'mei',
        contentRef: '双审签核：Rachel / Mei'
      })
      toast('ok', '双审通过，已生成可交接版本')
    },
    [appendAudit, exceptions, notes, roleId, toast, updateNote]
  )

  const complianceReject = useCallback(
    (noteId: string, reason: string) => {
      updateNote(noteId, (x) => ({ ...x, stage: 'analyst_review' }))
      appendAudit(noteId, roleId, '合规否决', reason, { signer: 'mei' })
      toast('warn', '已否决并退回分析师复核，原因写入审核日志')
    },
    [appendAudit, roleId, toast, updateNote]
  )

  const isolateException = useCallback(
    (id: string) => {
      setExceptions((list) =>
        list.map((e) =>
          e.id === id
            ? {
                ...e,
                isolated: true,
                autoSuggestionStopped: true,
                status: 'isolated',
                confirmTime: nowStamp(),
                history: [
                  ...e.history,
                  { at: nowStamp(), actor: 'mei', action: '隔离', detail: '已隔离，未进入模型上下文；人工确认时间留痕' }
                ]
              }
            : e
        )
      )
      const ex = exceptions.find((e) => e.id === id)
      if (ex) {
        updateNote(ex.noteId, (n) => ({ ...n, autoSuggestionStopped: true, stage: 'blocked' }))
        appendAudit(ex.noteId, 'mei', '异常隔离', `${id}：已隔离，未进入模型上下文`, {
          signer: 'mei',
          contentRef: id
        })
      }
      toast('warn', '已隔离并停止自动建议，研究与交易侧保持隔离')
    },
    [appendAudit, exceptions, toast, updateNote]
  )

  const dispatchException = useCallback(
    (id: string, assignee: RoleId, deadline: string, returnReason: string) => {
      setExceptions((list) =>
        list.map((e) =>
          e.id === id
            ? {
                ...e,
                assignee,
                deadline,
                returnReason,
                status: e.isolated ? 'isolated' : 'assigned',
                confirmTime: e.confirmTime ?? nowStamp(),
                history: [
                  ...e.history,
                  {
                    at: nowStamp(),
                    actor: 'david',
                    action: '分派',
                    detail: `处理人 ${roleById(assignee).name}，截止 ${deadline}；退回原因：${returnReason}`
                  }
                ]
              }
            : e
        )
      )
      const ex = exceptions.find((e) => e.id === id)
      if (ex) {
        appendAudit(ex.noteId, 'david', '异常分派', `${id} 分派给 ${roleById(assignee).name}`, {
          signer: 'david',
          contentRef: id
        })
      }
      toast('ok', `已分派，写明处理人、截止时间与退回原因（不是只改状态）`)
    },
    [appendAudit, exceptions, toast]
  )

  const resolveException = useCallback(
    (id: string, detail: string) => {
      setExceptions((list) =>
        list.map((e) =>
          e.id === id
            ? {
                ...e,
                status: 'resolved',
                confirmTime: nowStamp(),
                history: [
                  ...e.history,
                  { at: nowStamp(), actor: roleId, action: '关闭', detail }
                ]
              }
            : e
        )
      )
      const ex = exceptions.find((e) => e.id === id)
      if (ex) {
        const stillOpen = exceptions.some(
          (e) => e.noteId === ex.noteId && e.id !== id && e.status !== 'resolved'
        )
        if (!stillOpen) {
          updateNote(ex.noteId, (n) => (n.stage === 'blocked' ? { ...n, stage: 'analyst_review' } : n))
        }
        appendAudit(ex.noteId, roleId, '异常关闭', `${id} 已关闭：${detail}`, { contentRef: id })
      }
      toast('ok', '异常已关闭，处理路径留痕')
    },
    [appendAudit, exceptions, roleId, toast, updateNote]
  )

  const escalateException = useCallback(
    (id: string) => {
      setExceptions((list) =>
        list.map((e) =>
          e.id === id
            ? {
                ...e,
                status: 'escalated',
                escalatedTo: 'sarah',
                history: [
                  ...e.history,
                  { at: nowStamp(), actor: 'sarah', action: '超时升级', detail: '超过截止时间未关闭，交由首席投资官协调' }
                ]
              }
            : e
        )
      )
      toast('warn', '已升级至 Sarah 协调')
    },
    [toast]
  )

  const confirmHandoff = useCallback(
    (noteId: string, by: RoleId) => {
      const h = handoffs.find((x) => x.noteId === noteId)
      if (!h) return
      const missing = h.fields.filter((f) => f.required && !f.provided)
      if (missing.length > 0) {
        toast('block', `交接清单缺少必填项：${missing.map((m) => m.label).join('、')}，不能完成交接`)
        return
      }
      if (by !== h.to) {
        toast('block', `只有接手人 ${roleById(h.to).name} 确认，责任才转移（当前角色无权确认）`)
        return
      }
      setHandoffs((list) =>
        list.map((x) =>
          x.noteId === noteId ? { ...x, status: 'confirmed', confirmedBy: by, confirmedAt: nowStamp() } : x
        )
      )
      appendAudit(noteId, by, '交接确认', '接手人明确确认，本岗待办结束（发送消息不等于责任转移）', {
        signer: by
      })
      toast('ok', '接手人已确认，责任正式转移')
    },
    [appendAudit, handoffs, toast]
  )

  const fixBasis = useCallback(
    (metricKey: string) => {
      setMetrics((list) =>
        list.map((m) => (m.key === metricKey ? { ...m, basisFixed: true } : m))
      )
      toast('ok', '已由业务负责人书面固定口径（分母 / 统计周期 / 排除规则）')
    },
    [toast]
  )

  const value = useMemo<AppState & AppActions>(
    () => ({
      roleId,
      view,
      selectedNoteId,
      selectedFieldId,
      selectedExceptionId,
      notes,
      exceptions,
      audit,
      handoffs,
      metrics,
      toasts,
      setRole: (id) => {
        setRoleId(id)
        toast('ok', `已切换为 ${roleById(id).name} · ${roleById(id).title}`)
      },
      setView,
      selectNote: setSelectedNoteId,
      selectField: setSelectedFieldId,
      selectException: setSelectedExceptionId,
      can,
      toast,
      dismissToast,
      linkSource,
      correctField,
      submitNote,
      complianceApprove,
      complianceReject,
      isolateException,
      dispatchException,
      resolveException,
      escalateException,
      confirmHandoff,
      fixBasis
    }),
    [
      roleId,
      view,
      selectedNoteId,
      selectedFieldId,
      selectedExceptionId,
      notes,
      exceptions,
      audit,
      handoffs,
      metrics,
      toasts,
      can,
      toast,
      dismissToast,
      linkSource,
      correctField,
      submitNote,
      complianceApprove,
      complianceReject,
      isolateException,
      dispatchException,
      resolveException,
      escalateException,
      confirmHandoff,
      fixBasis
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppState & AppActions {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 AppProvider 内使用')
  return ctx
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function nowStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export function noteStatusSummary(n: ResearchNote) {
  const ok = n.fields.filter((f) => f.status === 'ok').length
  const unverified = n.fields.filter((f) => f.status === 'unverified').length
  const flagged = n.fields.filter((f) => f.status === 'flagged').length
  return { ok, unverified, flagged, total: n.fields.length }
}
