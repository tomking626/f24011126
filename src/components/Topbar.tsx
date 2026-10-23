import { useApp } from '../store'
import { roleById } from '../data/mock'
import { Chip } from './ui'

export function Topbar() {
  const { notes, selectedNoteId, selectNote, roleId } = useApp()
  const note = notes.find((n) => n.id === selectedNoteId) ?? notes[0]
  const role = roleById(roleId)

  return (
    <div className="topbar">
      <div className="note-tabs">
        {notes.map((n) => (
          <button
            key={n.id}
            className={`note-tab ${n.id === selectedNoteId ? 'active' : ''}`}
            onClick={() => selectNote(n.id)}
          >
            {n.ticker} · {n.period}
          </button>
        ))}
      </div>

      <div className="spacer" />

      <div className="sync">
        <span>
          业务编号 <b className="mono">{note.bizNo}</b>
        </span>
        <span>
          模板 <b>{note.templateVersion}</b>
        </span>
        <span>
          最后同步 <b className="mono">{note.lastSyncedAt}</b>
        </span>
        {note.autoSuggestionStopped ? (
          <Chip tone="danger">
            <span className="dot" /> 已停止自动建议
          </Chip>
        ) : (
          <Chip tone="ok">
            <span className="dot" /> 自动建议运行中
          </Chip>
        )}
        <Chip tone="solid">
          {role.name} · {role.title}
        </Chip>
      </div>
    </div>
  )
}
