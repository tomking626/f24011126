import { useApp } from '../store'
import { ROLES, SCOPE_BOUNDARIES, STOP_CONDITIONS } from '../data/mock'
import { Card, Chip } from '../components/ui'
import type { Permission } from '../types'

const PERM_LABEL: Record<Permission, string> = {
  'note.view': '查看笔记',
  'note.verifySource': '逐项核对来源',
  'note.editField': '人工修正字段',
  'note.submit': '提交复核',
  'note.dualReview.compliance': '合规双审放行/否决',
  'note.dualReview.analyst': '分析师复核签核',
  'exception.isolate': '异常隔离',
  'exception.dispatch': '异常分派',
  'exception.resolve': '异常关闭',
  'exception.escalate': '超时升级',
  'handoff.prepare': '准备交接',
  'handoff.confirm': '交接确认',
  'pilot.defineBaseline': '固定基线口径',
  'pilot.approve': '立项批准'
}

const ALL_PERMS = Object.keys(PERM_LABEL) as Permission[]

export function ScopeView() {
  const { roleId } = useApp()

  return (
    <div className="content">
      <Card title="项目定位与红线" sub="不可逆动作：发布与交易接口；研究侧只生成草稿">
        <div className="grid grid-2">
          <div>
            <b>停止条件（触发即终止试点，不是扣分项）</b>
            <ul className="stoplist" style={{ marginTop: 8 }}>
              {STOP_CONDITIONS.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <b>首期范围边界</b>
            <ul className="stoplist" style={{ marginTop: 8 }}>
              {SCOPE_BOUNDARIES.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <Card title="角色与最小权限" sub="越权动作会被拦截，且必须指定具名人工接收人">
        <table className="table">
          <thead>
            <tr>
              <th>角色</th>
              <th>定位</th>
              {ALL_PERMS.map((p) => (
                <th key={p} className="tiny">
                  {PERM_LABEL[p]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.id} className={r.id === roleId ? 'sel' : ''}>
                <td>
                  <b>{r.name}</b>
                  <div className="tiny muted">{r.title}</div>
                </td>
                <td className="small muted">{r.stance}</td>
                {ALL_PERMS.map((p) => (
                  <td key={p}>{r.permissions.includes(p) ? <Chip tone="ok">✓</Chip> : <span className="muted-2">—</span>}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="原型局限（与报告一致）" sub="本原型仅用于验证交互与留痕逻辑">
        <p className="small" style={{ color: '#334155', margin: 0 }}>
          本分析仅基于已采集的 36 项事实与访谈材料，未核实单量、耗时分布、双审通过率、反馈受理时效等样本，收益与试点规模不能量化；
          访谈中合规官与交易员多次声明具体审批层级、系统权限配置、归档能力尚未核实，相关假设需人工确认。
          调查覆盖率不代表验收通过，四类材料不构成四视角收敛。
        </p>
        <div className="hint" style={{ marginTop: 10 }}>
          本原型使用合成数据（NovaTech / Halcyon / Meridian 均为虚构公司），不连接任何真实行情、供应商接口或交易系统。
        </div>
      </Card>
    </div>
  )
}
