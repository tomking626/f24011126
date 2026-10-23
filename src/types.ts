/**
 * 领域模型 —— 严格对齐《Helix Capital · 业务需求发现报告》
 *
 * 关键边界（报告口径）：
 *  - 草稿仅为起点：研究草稿 → 分析师复核 → 合规审批 → 交易侧接收，不能自动发布 [finance-f01]
 *  - 只生成研究侧草稿，不能访问交易下单接口 [finance-f32]
 *  - 非公开重大信息（MNPI）不能进入模型上下文，研究与交易侧保持隔离 [finance-f40]
 *  - 每条数字与实质主张可追溯到资料片段；缺少来源标记「待核验」，不输出猜测值 [finance-f42]
 */

export type RoleId = 'sarah' | 'david' | 'rachel' | 'mei' | 'carmen' | 'aditya'

/** 留痕主体：具名角色，或系统自动动作（如超时升级） */
export type Actor = RoleId | 'system'

export interface Role {
  id: RoleId
  name: string
  title: string
  /** 报告中的四来源定位：Buyer / 业务口径 / Operator / 合规 / 下游 / 技术 */
  stance: string
  responsibilities: string[]
  /** 拥有的动作权限（最小权限原则，避免越权） */
  permissions: Permission[]
}

export type Permission =
  | 'note.view'
  | 'note.verifySource'
  | 'note.editField'
  | 'note.submit'
  | 'note.dualReview.compliance'
  | 'note.dualReview.analyst'
  | 'exception.isolate'
  | 'exception.dispatch'
  | 'exception.resolve'
  | 'exception.escalate'
  | 'handoff.prepare'
  | 'handoff.confirm'
  | 'pilot.defineBaseline'
  | 'pilot.approve'

export type DocType = '财报原文' | '10-Q' | '历史笔记' | '共识快照' | '发布审批记录'

/** 可追溯到的最小资料片段（引用链的落点） */
export interface SourceSnippet {
  id: string
  docType: DocType
  docName: string
  /** 版本号，交接与审计必须携带 */
  version: string
  /** 原文位置：页码/章节，对应报告「所有数字必须关联原文位置」[finance-f12] */
  location: string
  quote: string
  /** 事件时间戳，用于校验时效 [finance-f33] */
  eventTime: string
  unit: string
  basis: string
  /** 主编号，故障恢复后按业务编号去重补齐 [finance-f35] */
  masterId: string
  /** 只读快照过期标记 [finance-f34] */
  stale?: boolean
}

export type ValueKind = 'actual' | 'consensus' | 'delta'

export const VALUE_KIND_LABEL: Record<ValueKind, string> = {
  actual: '实际值',
  consensus: '共识值',
  delta: '差值'
}

/** 字段核验状态：ok 可发送 / unverified 待核验 / flagged 已拦截 */
export type FieldStatus = 'ok' | 'unverified' | 'flagged'

export interface NoteField {
  id: string
  label: string
  kind: ValueKind
  value: string
  unit: string
  /** 口径来源，须标注资料源、时间戳、单位一致性 [finance-f21] */
  basis: string
  /** 关联的原文位置（REQ-1 核心能力）；为空即「缺引用」 */
  sourceIds: string[]
  status: FieldStatus
  /** 待核验 / 拦截原因 */
  note?: string
  /** 是否被人工修正过（版本链需要） */
  corrected?: boolean
  correctionReason?: string
}

/** 财报 Q&A 指引变化 —— 高频漏点，须单独标出 [finance-f11] */
export interface GuidanceChange {
  id: string
  topic: string
  text: string
  sourceId: string
  changed: boolean
  flagged?: boolean
}

export type NoteStage = 'draft' | 'analyst_review' | 'compliance_review' | 'handoff' | 'blocked'

export const NOTE_STAGE_LABEL: Record<NoteStage, string> = {
  draft: 'AI 草稿（未复核）',
  analyst_review: '分析师复核中',
  compliance_review: '合规审批中',
  handoff: '待交接 / 已交接',
  blocked: '已拦截（停止自动建议）'
}

export interface ResearchNote {
  id: string
  /** 业务编号，反馈与去重均以此为准 [finance-f54][finance-f35] */
  bizNo: string
  company: string
  ticker: string
  period: string
  stage: NoteStage
  templateVersion: string
  /** 最后同步时间必须留在一处，否则复核断线 [finance-f13] */
  lastSyncedAt: string
  modelContextVersion: string
  fields: NoteField[]
  guidanceChanges: GuidanceChange[]
  /** 未解决事项（交接必填）[finance-f23] */
  unresolved: string[]
  /** 生成该草稿所用的资料源版本快照，用于审计重建 [finance-f45] */
  sourceSnapshot: { docName: string; version: string }[]
  /** 是否已生成草稿（AI 侧），以及草稿是否因异常被停止自动建议 */
  autoSuggestionStopped: boolean
}

export type ExceptionType =
  | 'MNPI'
  | 'MISSING_CITATION'
  | 'BASIS_MISMATCH'
  | 'SOURCE_MISSING'
  | 'SYSTEM_DOWN'

export const EXCEPTION_TYPE_LABEL: Record<ExceptionType, string> = {
  MNPI: '重大非公开信息',
  MISSING_CITATION: '数字缺少引用',
  BASIS_MISMATCH: '原始口径不一致',
  SOURCE_MISSING: '资料源缺关键字段',
  SYSTEM_DOWN: '关键系统不可用'
}

export type ExceptionStatus = 'open' | 'assigned' | 'resolved' | 'escalated' | 'isolated'

export const EXCEPTION_STATUS_LABEL: Record<ExceptionStatus, string> = {
  open: '待分派',
  assigned: '已分派',
  resolved: '已关闭',
  escalated: '超时已升级',
  isolated: '已隔离'
}

export interface ExceptionCase {
  id: string
  bizNo: string
  noteId: string
  type: ExceptionType
  severity: 'P0' | 'P1'
  detectedAt: string
  /** 触发兜底的原因（须显式标明）[finance-f44] */
  reason: string
  /** 是否已隔离，MNPI 必须隔离且不进模型上下文 */
  isolated: boolean
  autoSuggestionStopped: boolean
  /** 分派信息：处理人、截止时间、退回原因 [finance-f25] */
  assignee?: RoleId
  deadline?: string
  returnReason?: string
  /** 人工确认时间，须留痕 [finance-f44] */
  confirmTime?: string
  status: ExceptionStatus
  escalatedTo?: RoleId
  /** 是否携带原文片段交接 */
  carriesSourceSnippet?: boolean
  /** 关联的资料版本，供合规记录使用版本 [finance-f24] */
  sourceVersionRef?: string
  history: { at: string; actor: Actor; action: string; detail: string }[]
}

export type AuditAction =
  | 'AI建议'
  | '人工修正'
  | '提交复核'
  | '合规双审通过'
  | '合规否决'
  | '异常隔离'
  | '异常分派'
  | '异常关闭'
  | '交接确认'
  | '发布拦截'
  | '草稿生成'

export interface AuditEntry {
  id: string
  noteId: string
  bizNo: string
  version: number
  at: string
  actor: RoleId
  action: AuditAction
  detail: string
  /** 该版本引用的资料版本链（原文/历史笔记/共识快照/审批记录） */
  sourceVersionRefs: { docName: string; version: string }[]
  /** 建议内容 / 修正内容 —— 审计要能重建当次处理 [finance-f45] */
  contentRef?: string
  signer?: RoleId
  correctionReason?: string
  /** 是否记录了非必要个人信息（应为 false） */
  containsPII?: boolean
}

export interface HandoffField {
  key: string
  label: string
  required: boolean
  provided: boolean
  value?: string
}

export interface Handoff {
  noteId: string
  bizNo: string
  from: RoleId
  to: RoleId
  fields: HandoffField[]
  status: 'pending' | 'confirmed'
  confirmedBy?: RoleId
  confirmedAt?: string
  /** 提醒：发送消息不等于责任转移 [finance-f23] */
  note: string
}

/** 试点度量与收益口径（REQ-6） —— 基线须按人员分工重算 */
export interface PilotMetric {
  key: string
  label: string
  /** 口径是否已由业务负责人书面固定 */
  basisFixed: boolean
  basisOwner: RoleId
  /** 已采集样本量 */
  sampleCount: number
  sampleTarget: number
  /** 无样本时不得承诺数值 */
  value: string | null
  note: string
}

export interface CostLine {
  key: string
  label: string
  amount: number | null
  note: string
  /** 既有系统采购不纳入节省额 [finance-f03] */
  excludedFromSaving: boolean
}
