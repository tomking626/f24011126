import { useApp } from './store'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Toasts } from './components/Toasts'
import { DashboardView } from './views/DashboardView'
import { DraftView } from './views/DraftView'
import { ExceptionsView } from './views/ExceptionsView'
import { AuditView } from './views/AuditView'
import { HandoffView } from './views/HandoffView'
import { PilotView } from './views/PilotView'
import { ScopeView } from './views/ScopeView'

export default function App() {
  const { view } = useApp()

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <div className="banner">
          <span className="tag">红线</span>
          <span className="b-item">不可自动发布：研究草稿 → 分析师复核 → 合规审批 → 交易侧接收</span>
          <span className="b-item">不接交易下单接口</span>
          <span className="b-item">MNPI 隔离，不进模型上下文</span>
          <span className="b-item">每个数字必须关联原文位置，缺引用标待核验</span>
        </div>

        {view === 'dashboard' && <DashboardView />}
        {view === 'draft' && <DraftView />}
        {view === 'exceptions' && <ExceptionsView />}
        {view === 'audit' && <AuditView />}
        {view === 'handoff' && <HandoffView />}
        {view === 'pilot' && <PilotView />}
        {view === 'scope' && <ScopeView />}
      </div>
      <Toasts />
    </div>
  )
}
