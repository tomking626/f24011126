import React from 'react'
import { EXCEPTION_STATUS_LABEL, NOTE_STAGE_LABEL, VALUE_KIND_LABEL } from '../types'
import type { ExceptionStatus, FieldStatus, NoteStage, ValueKind } from '../types'

export type Tone = 'default' | 'ok' | 'warn' | 'danger' | 'info' | 'purple' | 'solid'

export function Chip({ tone = 'default', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`chip ${tone === 'default' ? '' : tone}`}>{children}</span>
}

export function Card({
  title,
  sub,
  right,
  children,
  bodyPad = true
}: {
  title?: React.ReactNode
  sub?: React.ReactNode
  right?: React.ReactNode
  children?: React.ReactNode
  bodyPad?: boolean
}) {
  return (
    <section className="card">
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <div className="card-title">{title}</div>}
            {sub && <div className="card-sub">{sub}</div>}
          </div>
          <div className="spacer" />
          {right}
        </header>
      )}
      <div className={bodyPad ? 'card-body' : ''}>{children}</div>
    </section>
  )
}

export function KindBadge({ kind }: { kind: ValueKind }) {
  return <span className={`badge-kind ${kind}`}>{VALUE_KIND_LABEL[kind]}</span>
}

const FIELD_STATUS_META: Record<FieldStatus, { label: string; tone: Tone }> = {
  ok: { label: '可发送', tone: 'ok' },
  unverified: { label: '待核验', tone: 'warn' },
  flagged: { label: '已拦截', tone: 'danger' }
}

export function FieldStatusChip({ status }: { status: FieldStatus }) {
  const m = FIELD_STATUS_META[status]
  return <Chip tone={m.tone}>{m.label}</Chip>
}

const STAGE_TONE: Record<NoteStage, Tone> = {
  draft: 'default',
  analyst_review: 'info',
  compliance_review: 'purple',
  handoff: 'ok',
  blocked: 'danger'
}

export function StageChip({ stage }: { stage: NoteStage }) {
  return <Chip tone={STAGE_TONE[stage]}>{NOTE_STAGE_LABEL[stage]}</Chip>
}

const EX_TONE: Record<ExceptionStatus, Tone> = {
  open: 'warn',
  assigned: 'info',
  resolved: 'ok',
  escalated: 'danger',
  isolated: 'purple'
}

export function ExceptionStatusChip({ status }: { status: ExceptionStatus }) {
  return <Chip tone={EX_TONE[status]}>{EXCEPTION_STATUS_LABEL[status]}</Chip>
}

export function KV({ items }: { items: { k: string; v: React.ReactNode }[] }) {
  return (
    <div className="kv">
      {items.map((it) => (
        <span key={it.k}>
          {it.k} <b>{it.v}</b>
        </span>
      ))}
    </div>
  )
}

export function Legend() {
  return (
    <div className="legend">
      <span>
        <span className="dot" style={{ background: '#15803d' }} /> 可发送
      </span>
      <span>
        <span className="dot" style={{ background: '#b45309' }} /> 待核验（缺引用）
      </span>
      <span>
        <span className="dot" style={{ background: '#b91c1c' }} /> 已拦截（口径不一致 / MNPI）
      </span>
      <span>点击行查看关联的原文片段</span>
    </div>
  )
}
