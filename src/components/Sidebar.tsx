import { useApp } from '../store'
import type { ViewId } from '../store'
import { ROLES, roleById } from '../data/mock'

const NAV: { id: ViewId; label: string; req?: string }[] = [
  { id: 'dashboard', label: '工作台总览' },
  { id: 'draft', label: '草稿与来源核对', req: 'REQ-1 · REQ-5' },
  { id: 'exceptions', label: '异常兜底与分派', req: 'REQ-2' },
  { id: 'audit', label: '双审与版本链', req: 'REQ-3' },
  { id: 'handoff', label: '结构化交接', req: 'REQ-4' },
  { id: 'pilot', label: '试点度量与收益口径', req: 'REQ-6' },
  { id: 'scope', label: '范围与红线' }
]

export function Sidebar() {
  const { roleId, setRole, view, setView, exceptions } = useApp()
  const role = roleById(roleId)
  const openCount = exceptions.filter((e) => e.status === 'open' || e.status === 'escalated').length

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">HC</div>
        <div>
          <h1>Helix Capital</h1>
          <p>财报后一页研究笔记 · 原型</p>
        </div>
      </div>

      <div>
        <p className="role-select-label">当前角色（权限随角色变化）</p>
        <select className="role-select" value={roleId} onChange={(e) => setRole(e.target.value as never)}>
          {ROLES.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.title}
            </option>
          ))}
        </select>
      </div>

      <nav className="nav">
        {NAV.map((n) => (
          <button
            key={n.id}
            className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span>
              {n.label}
              {n.req && <span className="tiny muted"> · {n.req}</span>}
            </span>
            {n.id === 'exceptions' && openCount > 0 && <span className="pill">{openCount}</span>}
          </button>
        ))}
      </nav>

      <div className="role-card">
        <h4>{role.name} · {role.title}</h4>
        <div className="stance">{role.stance}</div>
        <ul>
          {role.responsibilities.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
