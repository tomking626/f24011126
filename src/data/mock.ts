import type {
  Actor,
  AuditEntry,
  CostLine,
  ExceptionCase,
  Handoff,
  PilotMetric,
  ResearchNote,
  Role,
  SourceSnippet
} from '../types'

/* ------------------------------------------------------------------ *
 * 角色 —— 对应报告的四来源与访谈对象
 * ------------------------------------------------------------------ */

export const ROLES: Role[] = [
  {
    id: 'sarah',
    name: 'Sarah',
    title: '首席投资官',
    stance: 'Buyer · 业务决策者',
    responsibilities: [
      '业务立项与试点范围',
      '试点预算与净收益口径 [finance-f03]',
      '停止条件的判定与执行 [finance-f02]',
      '异常超时协调、每周复盘指定改进负责人 [finance-f25][finance-f55]'
    ],
    permissions: ['note.view', 'pilot.approve', 'exception.escalate']
  },
  {
    id: 'david',
    name: 'David',
    title: '研究负责人',
    stance: '业务口径 · 责任转移判定',
    responsibilities: [
      '覆盖与耗时基线、收益口径 [finance-f22]',
      '异常分派：处理人 / 截止时间 / 退回原因 [finance-f25]',
      '交接责任转移判定 [finance-f23]',
      '口径争议登记版本并交合规确认 [finance-f24]'
    ],
    permissions: [
      'note.view',
      'exception.dispatch',
      'exception.resolve',
      'exception.escalate',
      'handoff.prepare',
      'handoff.confirm',
      'pilot.defineBaseline'
    ]
  },
  {
    id: 'rachel',
    name: 'Rachel',
    title: '资深分析师',
    stance: 'Operator · 一线使用者',
    responsibilities: [
      '逐项对回原文，不看摘要顺不顺 [finance-f10]',
      '标记待核验、保留最后同步时间 [finance-f13]',
      '发现缺引用 / 口径不一致时上抛 David [finance-f15]'
    ],
    permissions: ['note.view', 'note.verifySource', 'note.editField', 'note.submit', 'exception.resolve']
  },
  {
    id: 'mei',
    name: 'Mei',
    title: '合规官',
    stance: '合规红线 · 风险否决权 [finance-f04]',
    responsibilities: [
      '双重审批：分析师 + 合规共同审核 [finance-f41]',
      'MNPI 隔离，不进模型上下文 [finance-f40]',
      '审核日志版本链与留存边界 [finance-f45][finance-f43]'
    ],
    permissions: ['note.view', 'note.dualReview.compliance', 'exception.isolate']
  },
  {
    id: 'carmen',
    name: 'Carmen',
    title: '交易员',
    stance: '下游 · 交接结果验收 [finance-f04]',
    responsibilities: [
      '只能看审批后笔记 [finance-f50]',
      '要求区分实际值 / 共识值 / 差值 [finance-f51]',
      '反馈须关联原业务编号与资料版本 [finance-f54]'
    ],
    permissions: ['note.view', 'handoff.confirm']
  },
  {
    id: 'aditya',
    name: 'Aditya',
    title: '技术负责人',
    stance: '技术可行性 · 只读集成',
    responsibilities: [
      'Snowflake / Python / Bloomberg / FactSet 只读集成 [finance-f30]',
      '供应商许可与外传边界确认 [finance-f31]',
      '主编号 / 事件时间 / 来源 / 版本校验 [finance-f33]',
      '接口失败保留只读快照，按业务编号去重补齐 [finance-f35]'
    ],
    permissions: ['note.view', 'exception.resolve', 'pilot.defineBaseline']
  }
]

export function roleById(id: string): Role {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]
}

/** 留痕主体名称：系统自动动作显示为「系统」 */
export function actorName(id: Actor): string {
  return id === 'system' ? '系统' : roleById(id).name
}

/* ------------------------------------------------------------------ *
 * 资料片段池 —— 每个数字的引用落点
 * ------------------------------------------------------------------ */

export const SOURCES: SourceSnippet[] = [
  {
    id: 'src-ntx-rev',
    docType: '10-Q',
    docName: 'NovaTech 2026 Q3 10-Q',
    version: 'v2 · 2026-10-18 16:05',
    location: 'P.12 §MD&A 收入',
    quote: '第三季度总营收为 12.486 亿美元，同比增长 9.1%。',
    eventTime: '2026-10-18 16:00',
    unit: '百万美元',
    basis: '集团合并报表 · GAAP',
    masterId: 'NVTX-10Q-2026Q3'
  },
  {
    id: 'src-ntx-cons-rev',
    docType: '共识快照',
    docName: 'NovaTech 一致预期快照',
    version: 'snap-2026-10-17',
    location: '汇总行 · 营收',
    quote: '市场一致预期营收 12.200 亿美元（12 家机构均值，统计截止 2026-10-17）。',
    eventTime: '2026-10-17 18:00',
    unit: '百万美元',
    basis: '卖方一致预期 · 未剔除一次性项目',
    masterId: 'NVTX-CONS-2026Q3'
  },
  {
    id: 'src-ntx-eps',
    docType: '10-Q',
    docName: 'NovaTech 2026 Q3 10-Q',
    version: 'v2 · 2026-10-18 16:05',
    location: 'P.15 §每股收益',
    quote: '稀释每股收益为 2.14 美元，去年同期为 1.92 美元。',
    eventTime: '2026-10-18 16:00',
    unit: '美元/股',
    basis: 'GAAP 稀释口径',
    masterId: 'NVTX-10Q-2026Q3'
  },
  {
    id: 'src-ntx-cons-eps',
    docType: '共识快照',
    docName: 'NovaTech 一致预期快照',
    version: 'snap-2026-10-17',
    location: '汇总行 · EPS',
    quote: '市场一致预期稀释 EPS 为 2.05 美元。',
    eventTime: '2026-10-17 18:00',
    unit: '美元/股',
    basis: '卖方一致预期 · GAAP',
    masterId: 'NVTX-CONS-2026Q3'
  },
  {
    id: 'src-ntx-gm',
    docType: '10-Q',
    docName: 'NovaTech 2026 Q3 10-Q',
    version: 'v2 · 2026-10-18 16:05',
    location: 'P.14 §盈利质量',
    quote: '第三季度毛利率为 41.2%，同比提升 1.4 个百分点。',
    eventTime: '2026-10-18 16:00',
    unit: '%',
    basis: 'GAAP 毛利率',
    masterId: 'NVTX-10Q-2026Q3'
  },
  {
    id: 'src-ntx-cons-gm',
    docType: '共识快照',
    docName: 'NovaTech 一致预期快照',
    version: 'snap-2026-10-17',
    location: '汇总行 · 毛利率',
    quote: '市场一致预期毛利率 40.5%。',
    eventTime: '2026-10-17 18:00',
    unit: '%',
    basis: '卖方一致预期 · GAAP',
    masterId: 'NVTX-CONS-2026Q3'
  },
  {
    id: 'src-ntx-fcf-partial',
    docType: '财报原文',
    docName: 'NovaTech 2026 Q3 现金流表（预处理件）',
    version: 'raw-未校',
    location: '附录 A · 自由现金流',
    quote: '自由现金流 3.08 亿美元（注：该预处理件缺少事件时间与主编号）。',
    eventTime: '—',
    unit: '百万美元',
    basis: '未标注',
    masterId: '—'
  },
  {
    id: 'src-ntx-qa',
    docType: '财报原文',
    docName: 'NovaTech 2026 Q3 电话会 Q&A',
    version: 'v1 · 2026-10-18 21:40',
    location: 'Q4 提问 · 指引',
    quote: '管理层将 2027 财年营收增速指引由「中个位数」上调至「高个位数」。',
    eventTime: '2026-10-18 21:30',
    unit: '—',
    basis: '管理层口述 · 未经审计',
    masterId: 'NVTX-QA-2026Q3'
  },
  {
    id: 'src-ntx-custconc-new',
    docType: '10-Q',
    docName: 'NovaTech 2026 Q3 10-Q',
    version: 'v2 · 2026-10-18 16:05',
    location: 'P.22 §客户集中度',
    quote: '前五大客户收入占比 38%（按开票口径）。',
    eventTime: '2026-10-18 16:00',
    unit: '%',
    basis: '开票口径',
    masterId: 'NVTX-10Q-2026Q3'
  },
  {
    id: 'src-ntx-custconc-hist',
    docType: '历史笔记',
    docName: 'NovaTech 2026 Q2 研究笔记',
    version: 'v4 · 2026-07-20',
    location: '一页笔记 · 客户集中度',
    quote: '前五大客户占比 41%（含渠道折扣口径）。',
    eventTime: '2026-07-20 17:00',
    unit: '%',
    basis: '含渠道折扣口径',
    masterId: 'NVTX-NOTE-2026Q2'
  },
  {
    id: 'src-ntx-approval',
    docType: '发布审批记录',
    docName: 'NovaTech 2026 Q3 发布审批记录',
    version: 'appr-1 · 待生成',
    location: '审批链 · 第一版',
    quote: '发布审批链：研究草稿 → 分析师复核 → 合规审批 → 交易侧接收。',
    eventTime: '2026-10-18 22:00',
    unit: '—',
    basis: '流程约束',
    masterId: 'NVTX-APPR-2026Q3'
  },
  {
    id: 'src-hlcy-rev',
    docType: '财报原文',
    docName: 'Halcyon Energy 2026 Q3 业绩公告',
    version: 'v1 · 2026-10-19 07:30',
    location: '第 3 页 · 收入',
    quote: '第三季度营收 21.054 亿美元，同比下降 3.2%。',
    eventTime: '2026-10-19 07:00',
    unit: '百万美元',
    basis: 'GAAP',
    masterId: 'HLCY-ANN-2026Q3'
  },
  {
    id: 'src-hlcy-cons-rev',
    docType: '共识快照',
    docName: 'Halcyon 一致预期快照',
    version: 'snap-2026-10-18',
    location: '汇总行 · 营收',
    quote: '市场一致预期营收 21.800 亿美元。',
    eventTime: '2026-10-18 18:00',
    unit: '百万美元',
    basis: '卖方一致预期',
    masterId: 'HLCY-CONS-2026Q3'
  },
  {
    id: 'src-hlcy-cfo-partial',
    docType: '财报原文',
    docName: 'Halcyon 2026 Q3 现金流量表（预处理件）',
    version: 'raw-未校',
    location: '第 8 页 · 经营现金流',
    quote: '经营活动现金流 6.120 亿美元（预处理件缺少事件时间与版本号）。',
    eventTime: '—',
    unit: '百万美元',
    basis: '未标注',
    masterId: '—'
  },
  {
    id: 'src-hlcy-bbg',
    docType: '共识快照',
    docName: 'Bloomberg 供应快照',
    version: 'bbg-2026-10-19T06:12',
    location: '只读快照 · 行情',
    quote: '该只读快照签发于 06:12，已超过一个刷新周期。',
    eventTime: '2026-10-19 06:12',
    unit: '—',
    basis: '供应商只读快照',
    masterId: 'HLCY-BBG-2026Q3',
    stale: true
  },
  {
    id: 'src-mrdn-rev',
    docType: '10-Q',
    docName: 'Meridian Foods 2026 Q3 10-Q',
    version: 'v1 · 2026-10-21 16:10',
    location: 'P.9 §收入',
    quote: '第三季度净销售额 8.423 亿美元。',
    eventTime: '2026-10-21 16:00',
    unit: '百万美元',
    basis: 'GAAP',
    masterId: 'MRDN-10Q-2026Q3'
  },
  {
    id: 'src-mrdn-cons-rev',
    docType: '共识快照',
    docName: 'Meridian 一致预期快照',
    version: 'snap-2026-10-20',
    location: '汇总行 · 收入',
    quote: '市场一致预期净销售额 8.300 亿美元。',
    eventTime: '2026-10-20 18:00',
    unit: '百万美元',
    basis: '卖方一致预期',
    masterId: 'MRDN-CONS-2026Q3'
  },
  {
    id: 'src-mrdn-sss',
    docType: '10-Q',
    docName: 'Meridian Foods 2026 Q3 10-Q',
    version: 'v1 · 2026-10-21 16:10',
    location: 'P.10 §同店销售',
    quote: '同店销售额同比增长 2.8%。',
    eventTime: '2026-10-21 16:00',
    unit: '%',
    basis: '同店口径 · 剔除汇率',
    masterId: 'MRDN-10Q-2026Q3'
  },
  {
    id: 'src-mrdn-cons-sss',
    docType: '共识快照',
    docName: 'Meridian 一致预期快照',
    version: 'snap-2026-10-20',
    location: '汇总行 · 同店',
    quote: '市场一致预期同店增长 2.1%。',
    eventTime: '2026-10-20 18:00',
    unit: '%',
    basis: '卖方一致预期',
    masterId: 'MRDN-CONS-2026Q3'
  },
  {
    id: 'src-mrdn-gm',
    docType: '10-Q',
    docName: 'Meridian Foods 2026 Q3 10-Q',
    version: 'v1 · 2026-10-21 16:10',
    location: 'P.11 §毛利率',
    quote: '毛利率 33.6%，同比下降 0.3 个百分点。',
    eventTime: '2026-10-21 16:00',
    unit: '%',
    basis: 'GAAP 毛利率',
    masterId: 'MRDN-10Q-2026Q3'
  },
  {
    id: 'src-mrdn-cons-gm',
    docType: '共识快照',
    docName: 'Meridian 一致预期快照',
    version: 'snap-2026-10-20',
    location: '汇总行 · 毛利率',
    quote: '市场一致预期毛利率 33.9%。',
    eventTime: '2026-10-20 18:00',
    unit: '%',
    basis: '卖方一致预期',
    masterId: 'MRDN-CONS-2026Q3'
  },
  {
    id: 'src-mrdn-eps',
    docType: '10-Q',
    docName: 'Meridian Foods 2026 Q3 10-Q',
    version: 'v1 · 2026-10-21 16:10',
    location: 'P.13 §每股收益',
    quote: '稀释每股收益 1.12 美元。',
    eventTime: '2026-10-21 16:00',
    unit: '美元/股',
    basis: 'GAAP 稀释口径',
    masterId: 'MRDN-10Q-2026Q3'
  },
  {
    id: 'src-mrdn-cons-eps',
    docType: '共识快照',
    docName: 'Meridian 一致预期快照',
    version: 'snap-2026-10-20',
    location: '汇总行 · EPS',
    quote: '市场一致预期稀释 EPS 1.06 美元。',
    eventTime: '2026-10-20 18:00',
    unit: '美元/股',
    basis: '卖方一致预期',
    masterId: 'MRDN-CONS-2026Q3'
  }
]

export function sourceById(id: string): SourceSnippet | undefined {
  return SOURCES.find((s) => s.id === id)
}

/* ------------------------------------------------------------------ *
 * 研究笔记 —— 三份样例，覆盖不同阶段与失败方式
 * ------------------------------------------------------------------ */

export const NOTES: ResearchNote[] = [
  {
    id: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    company: 'NovaTech',
    ticker: 'NVTX',
    period: '2026 Q3',
    stage: 'blocked',
    templateVersion: 'tmpl-1.2（实际/共识/差值）',
    lastSyncedAt: '2026-10-18 22:05',
    modelContextVersion: 'ctx-2026-10-18T16:05',
    autoSuggestionStopped: true,
    unresolved: [
      '自由现金流缺事件时间与主编号，待补原文位置后核验',
      '客户集中度新旧口径不一致，待 David 确认核实责任人',
      '存在疑似重大非公开信息，已隔离，待 David 分派'
    ],
    sourceSnapshot: [
      { docName: 'NovaTech 2026 Q3 10-Q', version: 'v2 · 2026-10-18 16:05' },
      { docName: 'NovaTech 一致预期快照', version: 'snap-2026-10-17' },
      { docName: 'NovaTech 2026 Q2 研究笔记', version: 'v4 · 2026-07-20' }
    ],
    fields: [
      {
        id: 'f-ntx-rev',
        label: '营收',
        kind: 'actual',
        value: '1,248.6',
        unit: '百万美元',
        basis: '集团合并报表 · GAAP',
        sourceIds: ['src-ntx-rev'],
        status: 'ok'
      },
      {
        id: 'f-ntx-rev-cons',
        label: '营收（共识）',
        kind: 'consensus',
        value: '1,220.0',
        unit: '百万美元',
        basis: '卖方一致预期 · 12 家均值',
        sourceIds: ['src-ntx-cons-rev'],
        status: 'ok'
      },
      {
        id: 'f-ntx-rev-delta',
        label: '营收（差值）',
        kind: 'delta',
        value: '+28.6 / +2.3%',
        unit: '百万美元',
        basis: '实际 − 共识',
        sourceIds: ['src-ntx-rev', 'src-ntx-cons-rev'],
        status: 'ok'
      },
      {
        id: 'f-ntx-eps',
        label: '稀释 EPS',
        kind: 'actual',
        value: '2.14',
        unit: '美元/股',
        basis: 'GAAP 稀释口径',
        sourceIds: ['src-ntx-eps'],
        status: 'ok'
      },
      {
        id: 'f-ntx-eps-cons',
        label: '稀释 EPS（共识）',
        kind: 'consensus',
        value: '2.05',
        unit: '美元/股',
        basis: '卖方一致预期 · GAAP',
        sourceIds: ['src-ntx-cons-eps'],
        status: 'ok'
      },
      {
        id: 'f-ntx-eps-delta',
        label: '稀释 EPS（差值）',
        kind: 'delta',
        value: '+0.09',
        unit: '美元/股',
        basis: '实际 − 共识',
        sourceIds: ['src-ntx-eps', 'src-ntx-cons-eps'],
        status: 'ok',
        corrected: true,
        correctionReason: '外包 KPI 初步提取错误，回原文修正 [finance-f10]'
      },
      {
        id: 'f-ntx-gm',
        label: '毛利率',
        kind: 'actual',
        value: '41.2',
        unit: '%',
        basis: 'GAAP 毛利率',
        sourceIds: ['src-ntx-gm'],
        status: 'ok'
      },
      {
        id: 'f-ntx-gm-delta',
        label: '毛利率（差值）',
        kind: 'delta',
        value: '+0.7',
        unit: 'pp',
        basis: '实际 − 共识',
        sourceIds: ['src-ntx-gm', 'src-ntx-cons-gm'],
        status: 'ok'
      },
      {
        id: 'f-ntx-fcf',
        label: '自由现金流',
        kind: 'actual',
        value: '308.0',
        unit: '百万美元',
        basis: '未标注',
        sourceIds: ['src-ntx-fcf-partial'],
        status: 'unverified',
        note: '预处理件缺事件时间与主编号，缺引用 → 标记待核验，不输出猜测值 [finance-f42][finance-f33]'
      },
      {
        id: 'f-ntx-custconc',
        label: '前五大客户占比',
        kind: 'actual',
        value: '38',
        unit: '%',
        basis: '开票口径',
        sourceIds: ['src-ntx-custconc-new', 'src-ntx-custconc-hist'],
        status: 'flagged',
        note: '与历史笔记「含渠道折扣口径 41%」不一致，原始口径不一致 → 先由 David 核对 [finance-f15]'
      }
    ],
    guidanceChanges: [
      {
        id: 'g-ntx-1',
        topic: '2027 财年营收指引',
        text: '由「中个位数」上调至「高个位数」',
        sourceId: 'src-ntx-qa',
        changed: true
      },
      {
        id: 'g-ntx-2',
        topic: '资本开支计划',
        text: '维持「占营收 6%~7%」不变',
        sourceId: 'src-ntx-qa',
        changed: false
      }
    ]
  },
  {
    id: 'note-hlcy-q3',
    bizNo: 'HLCY-2026Q3-NOTE',
    company: 'Halcyon Energy',
    ticker: 'HLCY',
    period: '2026 Q3',
    stage: 'analyst_review',
    templateVersion: 'tmpl-1.2（实际/共识/差值）',
    lastSyncedAt: '2026-10-19 08:02',
    modelContextVersion: 'ctx-2026-10-19T07:30',
    autoSuggestionStopped: false,
    unresolved: [
      '经营现金流预处理件缺事件时间，已进人工修复队列',
      'Bloomberg 只读快照超过一个刷新周期，标注待刷新'
    ],
    sourceSnapshot: [
      { docName: 'Halcyon Energy 2026 Q3 业绩公告', version: 'v1 · 2026-10-19 07:30' },
      { docName: 'Halcyon 一致预期快照', version: 'snap-2026-10-18' }
    ],
    fields: [
      {
        id: 'f-hlcy-rev',
        label: '营收',
        kind: 'actual',
        value: '2,105.4',
        unit: '百万美元',
        basis: 'GAAP',
        sourceIds: ['src-hlcy-rev'],
        status: 'ok'
      },
      {
        id: 'f-hlcy-rev-cons',
        label: '营收（共识）',
        kind: 'consensus',
        value: '2,180.0',
        unit: '百万美元',
        basis: '卖方一致预期',
        sourceIds: ['src-hlcy-cons-rev'],
        status: 'ok'
      },
      {
        id: 'f-hlcy-rev-delta',
        label: '营收（差值）',
        kind: 'delta',
        value: '-74.6 / -3.4%',
        unit: '百万美元',
        basis: '实际 − 共识',
        sourceIds: ['src-hlcy-rev', 'src-hlcy-cons-rev'],
        status: 'ok'
      },
      {
        id: 'f-hlcy-cfo',
        label: '经营活动现金流',
        kind: 'actual',
        value: '612.0',
        unit: '百万美元',
        basis: '未标注',
        sourceIds: ['src-hlcy-cfo-partial'],
        status: 'unverified',
        note: '缺事件时间与版本号 → 进人工修复队列，不用猜测值补齐 [finance-f33]'
      }
    ],
    guidanceChanges: [
      {
        id: 'g-hlcy-1',
        topic: '全年产量指引',
        text: '下调至区间下沿',
        sourceId: 'src-hlcy-rev',
        changed: true,
        flagged: true
      }
    ]
  },
  {
    id: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    company: 'Meridian Foods',
    ticker: 'MRDN',
    period: '2026 Q3',
    stage: 'handoff',
    templateVersion: 'tmpl-1.2（实际/共识/差值）',
    lastSyncedAt: '2026-10-21 17:40',
    modelContextVersion: 'ctx-2026-10-21T16:10',
    autoSuggestionStopped: false,
    unresolved: ['无未解决事项（可交接）'],
    sourceSnapshot: [
      { docName: 'Meridian Foods 2026 Q3 10-Q', version: 'v1 · 2026-10-21 16:10' },
      { docName: 'Meridian 一致预期快照', version: 'snap-2026-10-20' }
    ],
    fields: [
      {
        id: 'f-mrdn-rev',
        label: '净销售额',
        kind: 'actual',
        value: '842.3',
        unit: '百万美元',
        basis: 'GAAP',
        sourceIds: ['src-mrdn-rev'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-rev-cons',
        label: '净销售额（共识）',
        kind: 'consensus',
        value: '830.0',
        unit: '百万美元',
        basis: '卖方一致预期',
        sourceIds: ['src-mrdn-cons-rev'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-rev-delta',
        label: '净销售额（差值）',
        kind: 'delta',
        value: '+12.3 / +1.5%',
        unit: '百万美元',
        basis: '实际 − 共识',
        sourceIds: ['src-mrdn-rev', 'src-mrdn-cons-rev'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-sss',
        label: '同店销售',
        kind: 'actual',
        value: '+2.8',
        unit: '%',
        basis: '同店口径 · 剔除汇率',
        sourceIds: ['src-mrdn-sss'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-sss-cons',
        label: '同店销售（共识）',
        kind: 'consensus',
        value: '+2.1',
        unit: '%',
        basis: '卖方一致预期',
        sourceIds: ['src-mrdn-cons-sss'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-sss-delta',
        label: '同店销售（差值）',
        kind: 'delta',
        value: '+0.7',
        unit: 'pp',
        basis: '实际 − 共识',
        sourceIds: ['src-mrdn-sss', 'src-mrdn-cons-sss'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-gm',
        label: '毛利率',
        kind: 'actual',
        value: '33.6',
        unit: '%',
        basis: 'GAAP 毛利率',
        sourceIds: ['src-mrdn-gm'],
        status: 'ok',
        corrected: true,
        correctionReason: '人工修正：将口径由「调整后」改回「GAAP」以与原文一致'
      },
      {
        id: 'f-mrdn-gm-delta',
        label: '毛利率（差值）',
        kind: 'delta',
        value: '-0.3',
        unit: 'pp',
        basis: '实际 − 共识',
        sourceIds: ['src-mrdn-gm', 'src-mrdn-cons-gm'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-eps',
        label: '稀释 EPS',
        kind: 'actual',
        value: '1.12',
        unit: '美元/股',
        basis: 'GAAP 稀释口径',
        sourceIds: ['src-mrdn-eps'],
        status: 'ok'
      },
      {
        id: 'f-mrdn-eps-delta',
        label: '稀释 EPS（差值）',
        kind: 'delta',
        value: '+0.06',
        unit: '美元/股',
        basis: '实际 − 共识',
        sourceIds: ['src-mrdn-eps', 'src-mrdn-cons-eps'],
        status: 'ok'
      }
    ],
    guidanceChanges: [
      {
        id: 'g-mrdn-1',
        topic: '全年营业利润率指引',
        text: '维持区间不变',
        sourceId: 'src-mrdn-gm',
        changed: false
      }
    ]
  }
]

export function noteById(id: string): ResearchNote | undefined {
  return NOTES.find((n) => n.id === id)
}

/* ------------------------------------------------------------------ *
 * 异常单 —— 兜底触发与人工分派
 * ------------------------------------------------------------------ */

export const EXCEPTIONS: ExceptionCase[] = [
  {
    id: 'EX-20261018-01',
    bizNo: 'NVTX-2026Q3-NOTE',
    noteId: 'note-ntx-q3',
    type: 'MNPI',
    severity: 'P0',
    detectedAt: '2026-10-18 22:10',
    reason: '输入流中出现疑似未公开交易讨论，属重大非公开信息，禁止进入模型上下文 [finance-f40]',
    isolated: true,
    autoSuggestionStopped: true,
    assignee: 'david',
    deadline: '2026-10-23 18:00',
    returnReason: '需 David 判定是否构成 MNPI 并指定隔离后的处理路径',
    confirmTime: '2026-10-18 22:40',
    status: 'isolated',
    carriesSourceSnippet: false,
    sourceVersionRef: 'NVTX-10Q-2026Q3 · v2',
    history: [
      { at: '2026-10-18 22:10', actor: 'aditya', action: '检测', detail: '只读拉取时命中非公开信息特征，停止自动建议' },
      { at: '2026-10-18 22:25', actor: 'mei', action: '隔离', detail: '判定为重大非公开信息，隔离且不进模型上下文，研究与交易侧保持隔离' },
      { at: '2026-10-18 22:40', actor: 'mei', action: '确认', detail: '人工确认时间留痕：2026-10-18 22:40' },
      { at: '2026-10-19 09:05', actor: 'david', action: '分派', detail: '处理人定为 David，截止 2026-10-23 18:00；退回原因需说明处理路径' }
    ]
  },
  {
    id: 'EX-20261018-02',
    bizNo: 'NVTX-2026Q3-NOTE',
    noteId: 'note-ntx-q3',
    type: 'MISSING_CITATION',
    severity: 'P0',
    detectedAt: '2026-10-18 22:12',
    reason: '自由现金流数字缺少主编号与事件时间，无法关联原文位置 [finance-f42]',
    isolated: false,
    autoSuggestionStopped: true,
    assignee: 'rachel',
    deadline: '2026-10-23 15:00',
    returnReason: '缺引用，不得输出猜测值；需补回原文位置后重新核验',
    confirmTime: '2026-10-18 22:45',
    status: 'assigned',
    carriesSourceSnippet: true,
    sourceVersionRef: 'NVTX-2026Q3 现金流表 · raw-未校',
    history: [
      { at: '2026-10-18 22:12', actor: 'aditya', action: '检测', detail: '关键字段校验失败（缺事件时间 / 主编号），停止自动建议' },
      { at: '2026-10-19 09:10', actor: 'david', action: '分派', detail: '处理人 Rachel，截止 2026-10-23 15:00' },
      { at: '2026-10-19 09:30', actor: 'rachel', action: '受理', detail: '确认携带原文片段，回原文补位置' }
    ]
  },
  {
    id: 'EX-20261018-03',
    bizNo: 'NVTX-2026Q3-NOTE',
    noteId: 'note-ntx-q3',
    type: 'BASIS_MISMATCH',
    severity: 'P1',
    detectedAt: '2026-10-18 22:14',
    reason: '前五大客户占比在原文（开票口径 38%）与历史笔记（含渠道折扣口径 41%）之间口径不一致 [finance-f15]',
    isolated: false,
    autoSuggestionStopped: true,
    status: 'open',
    carriesSourceSnippet: false,
    sourceVersionRef: '需记录使用版本并由 Mei 确认 [finance-f24]',
    history: [
      { at: '2026-10-18 22:14', actor: 'rachel', action: '上抛', detail: '原始口径不一致，先交研究负责人 David 核对' }
    ]
  },
  {
    id: 'EX-20261019-04',
    bizNo: 'HLCY-2026Q3-NOTE',
    noteId: 'note-hlcy-q3',
    type: 'SYSTEM_DOWN',
    severity: 'P1',
    detectedAt: '2026-10-19 07:35',
    reason: 'Bloomberg 只读快照超过一个刷新周期，历史快照不能伪装成当前状态 [finance-f34]',
    isolated: false,
    autoSuggestionStopped: false,
    assignee: 'aditya',
    deadline: '2026-10-23 12:00',
    returnReason: '接口未恢复前继续走原人工流程，保留只读快照与时间戳',
    confirmTime: '2026-10-19 08:02',
    status: 'assigned',
    carriesSourceSnippet: true,
    sourceVersionRef: 'HLCY-BBG-2026Q3 · bbg-2026-10-19T06:12',
    history: [
      { at: '2026-10-19 07:35', actor: 'aditya', action: '检测', detail: '接口失败，继续原人工流程并保留只读快照与时间戳' },
      { at: '2026-10-19 08:02', actor: 'david', action: '分派', detail: '处理人 Aditya，截止 2026-10-23 12:00' }
    ]
  },
  {
    id: 'EX-20261019-05',
    bizNo: 'HLCY-2026Q3-NOTE',
    noteId: 'note-hlcy-q3',
    type: 'SOURCE_MISSING',
    severity: 'P1',
    detectedAt: '2026-10-19 07:38',
    reason: '经营现金流预处理件缺事件时间与版本号，进人工修复队列 [finance-f33]',
    isolated: false,
    autoSuggestionStopped: false,
    assignee: 'aditya',
    deadline: '2026-10-23 12:00',
    returnReason: '缺少关键字段，不用猜测值补齐',
    confirmTime: '2026-10-19 08:05',
    status: 'assigned',
    carriesSourceSnippet: true,
    sourceVersionRef: 'HLCY-2026Q3 现金流量表 · raw-未校',
    history: [
      { at: '2026-10-19 07:38', actor: 'aditya', action: '检测', detail: '关键字段校验失败，进人工修复队列' },
      { at: '2026-10-19 08:05', actor: 'david', action: '分派', detail: '处理人 Aditya，截止 2026-10-23 12:00' }
    ]
  },
  {
    id: 'EX-20261017-09',
    bizNo: 'PREV-2026Q2-NOTE',
    noteId: 'note-ntx-q3',
    type: 'BASIS_MISMATCH',
    severity: 'P1',
    detectedAt: '2026-10-17 10:20',
    reason: '口径争议超过截止时间未关闭，按规则超时交首席投资官 Sarah 协调 [finance-f25]',
    isolated: false,
    autoSuggestionStopped: true,
    assignee: 'david',
    deadline: '2026-10-21 18:00',
    returnReason: '口径争议需登记使用版本并由合规确认',
    confirmTime: '2026-10-17 10:50',
    status: 'escalated',
    escalatedTo: 'sarah',
    carriesSourceSnippet: false,
    sourceVersionRef: '—',
    history: [
      { at: '2026-10-17 10:20', actor: 'rachel', action: '上抛', detail: '口径不一致，交 David 核对' },
      { at: '2026-10-17 10:50', actor: 'david', action: '分派', detail: '处理人 David，截止 2026-10-21 18:00' },
      { at: '2026-10-21 18:01', actor: 'system', action: '超时升级', detail: '超过截止时间未关闭，自动升级至 Sarah 协调' }
    ]
  }
]

/* ------------------------------------------------------------------ *
 * 版本链 —— 双审与审计留痕（REQ-3）
 * ------------------------------------------------------------------ */

export const AUDIT: AuditEntry[] = [
  // NovaTech：AI 草稿 → 人工修正 → 提交 → 合规否决 → 隔离 → 分派
  {
    id: 'au-ntx-1',
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    version: 1,
    at: '2026-10-18 22:05',
    actor: 'aditya',
    action: '草稿生成',
    detail: '按发布事件刷新，生成研究侧草稿；只读快照与版本同步',
    sourceVersionRefs: [
      { docName: 'NovaTech 2026 Q3 10-Q', version: 'v2 · 2026-10-18 16:05' },
      { docName: 'NovaTech 一致预期快照', version: 'snap-2026-10-17' }
    ],
    contentRef: '草稿 v1（营收 / EPS / 毛利率 已关联原文位置）',
    containsPII: false
  },
  {
    id: 'au-ntx-2',
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    version: 2,
    at: '2026-10-18 22:08',
    actor: 'rachel',
    action: '人工修正',
    detail: '外包 KPI 初步提取错误，回原文修正稀释 EPS 差值',
    sourceVersionRefs: [{ docName: 'NovaTech 2026 Q3 10-Q', version: 'v2 · 2026-10-18 16:05' }],
    contentRef: 'EPS 差值 0.07 → 0.09',
    correctionReason: '与 10-Q 原文不符，逐项回原文核 [finance-f10]',
    containsPII: false
  },
  {
    id: 'au-ntx-3',
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    version: 3,
    at: '2026-10-18 22:20',
    actor: 'rachel',
    action: '提交复核',
    detail: '提交分析师复核；标记 2 处待核验、1 处口径不一致',
    sourceVersionRefs: [{ docName: 'NovaTech 2026 Q3 10-Q', version: 'v2 · 2026-10-18 16:05' }],
    contentRef: '待核验：自由现金流 / 前五大客户占比',
    containsPII: false
  },
  {
    id: 'au-ntx-4',
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    version: 4,
    at: '2026-10-18 22:32',
    actor: 'mei',
    action: '合规否决',
    detail: '存在重大非公开信息且存在缺引用项，停止自动建议，不予放行',
    sourceVersionRefs: [{ docName: 'NovaTech 2026 Q3 发布审批记录', version: 'appr-0 · 未通过' }],
    contentRef: '否决原因：MNPI 隔离红线 + 缺引用 + 口径不一致 [finance-f44]',
    signer: 'mei',
    containsPII: false
  },
  {
    id: 'au-ntx-5',
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    version: 5,
    at: '2026-10-18 22:25',
    actor: 'mei',
    action: '异常隔离',
    detail: 'MNPI 已隔离，未进入模型上下文；研究与交易侧保持隔离',
    sourceVersionRefs: [{ docName: 'NovaTech 2026 Q3 发布审批记录', version: 'appr-0 · 未通过' }],
    contentRef: 'EX-20261018-01',
    signer: 'mei',
    containsPII: false
  },
  {
    id: 'au-ntx-6',
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    version: 6,
    at: '2026-10-19 09:10',
    actor: 'david',
    action: '异常分派',
    detail: '分派缺引用与口径不一致异常，写明处理人、截止时间与退回原因',
    sourceVersionRefs: [{ docName: 'NovaTech 2026 Q3 发布审批记录', version: 'appr-0 · 未通过' }],
    contentRef: 'EX-20261018-02 / EX-20261018-03',
    signer: 'david',
    containsPII: false
  },
  // Meridian：完成的版本链，可重建当次处理
  {
    id: 'au-mrdn-1',
    noteId: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    version: 1,
    at: '2026-10-21 17:05',
    actor: 'aditya',
    action: '草稿生成',
    detail: '按发布事件刷新，生成研究侧草稿',
    sourceVersionRefs: [
      { docName: 'Meridian Foods 2026 Q3 10-Q', version: 'v1 · 2026-10-21 16:10' },
      { docName: 'Meridian 一致预期快照', version: 'snap-2026-10-20' }
    ],
    contentRef: '草稿 v1（10 个字段全部关联原文位置）',
    containsPII: false
  },
  {
    id: 'au-mrdn-2',
    noteId: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    version: 2,
    at: '2026-10-21 17:18',
    actor: 'rachel',
    action: '人工修正',
    detail: '毛利率口径由「调整后」改回「GAAP」以与原文一致',
    sourceVersionRefs: [{ docName: 'Meridian Foods 2026 Q3 10-Q', version: 'v1 · 2026-10-21 16:10' }],
    contentRef: '毛利率口径：调整后 → GAAP',
    correctionReason: '原文为 GAAP 口径，避免下游误读 [finance-f21]',
    containsPII: false
  },
  {
    id: 'au-mrdn-3',
    noteId: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    version: 3,
    at: '2026-10-21 17:25',
    actor: 'rachel',
    action: '提交复核',
    detail: '提交分析师复核，全部数字已关联原文位置',
    sourceVersionRefs: [{ docName: 'Meridian Foods 2026 Q3 10-Q', version: 'v1 · 2026-10-21 16:10' }],
    contentRef: '待审：10 个字段 / 1 处指引变化',
    containsPII: false
  },
  {
    id: 'au-mrdn-4',
    noteId: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    version: 4,
    at: '2026-10-21 17:36',
    actor: 'mei',
    action: '合规双审通过',
    detail: '分析师与合规共同审核完成，无仓位建议、无并购猜测',
    sourceVersionRefs: [
      { docName: 'Meridian Foods 2026 Q3 10-Q', version: 'v1 · 2026-10-21 16:10' },
      { docName: 'Meridian 2026 Q3 发布审批记录', version: 'appr-1 · 已通过' }
    ],
    contentRef: '双审签核：Rachel（分析师） / Mei（合规）',
    signer: 'mei',
    containsPII: false
  },
  {
    id: 'au-mrdn-5',
    noteId: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    version: 5,
    at: '2026-10-21 17:40',
    actor: 'david',
    action: '交接确认',
    detail: '按交接清单移交交易侧，接手人明确确认后责任才转移',
    sourceVersionRefs: [{ docName: 'Meridian 2026 Q3 发布审批记录', version: 'appr-1 · 已通过' }],
    contentRef: '交接清单 HO-MRDN-2026Q3',
    signer: 'carmen',
    containsPII: false
  }
]

/* ------------------------------------------------------------------ *
 * 交接清单（REQ-4）
 * ------------------------------------------------------------------ */

export const HANDOFFS: Handoff[] = [
  {
    noteId: 'note-mrdn-q3',
    bizNo: 'MRDN-2026Q3-NOTE',
    from: 'david',
    to: 'carmen',
    status: 'confirmed',
    confirmedBy: 'carmen',
    confirmedAt: '2026-10-21 17:40',
    note: '发送消息不等于责任转移，须接手人明确确认 [finance-f23]',
    fields: [
      { key: 'source', label: '财报原文（含版本）', required: true, provided: true, value: 'Meridian Foods 2026 Q3 10-Q · v1' },
      { key: 'history', label: '历史笔记', required: true, provided: true, value: 'Meridian 2026 Q2 研究笔记 · v3' },
      { key: 'consensus', label: '共识快照', required: true, provided: true, value: 'Meridian 一致预期快照 · snap-2026-10-20' },
      { key: 'approval', label: '发布审批记录', required: true, provided: true, value: 'appr-1 · 已通过（双审签核）' },
      { key: 'version', label: '当前版本', required: true, provided: true, value: '笔记 v5' },
      { key: 'unresolved', label: '未解决事项', required: true, provided: true, value: '无' }
    ]
  },
  {
    noteId: 'note-ntx-q3',
    bizNo: 'NVTX-2026Q3-NOTE',
    from: 'david',
    to: 'carmen',
    status: 'pending',
    note: '存在未解决事项与隔离中的异常，未满足交接前置条件',
    fields: [
      { key: 'source', label: '财报原文（含版本）', required: true, provided: true, value: 'NovaTech 2026 Q3 10-Q · v2' },
      { key: 'history', label: '历史笔记', required: true, provided: true, value: 'NovaTech 2026 Q2 研究笔记 · v4' },
      { key: 'consensus', label: '共识快照', required: true, provided: true, value: 'NovaTech 一致预期快照 · snap-2026-10-17' },
      { key: 'approval', label: '发布审批记录', required: true, provided: false, value: '未通过（合规否决）' },
      { key: 'version', label: '当前版本', required: true, provided: true, value: '笔记 v6' },
      { key: 'unresolved', label: '未解决事项', required: true, provided: false, value: '3 项待处理' }
    ]
  }
]

/* ------------------------------------------------------------------ *
 * 试点度量与收益口径（REQ-6）
 * ------------------------------------------------------------------ */

export const PILOT_METRICS: PilotMetric[] = [
  {
    key: 'sendable',
    label: '20 份样稿可发送率',
    basisFixed: false,
    basisOwner: 'david',
    sampleCount: 6,
    sampleTarget: 20,
    value: null,
    note: '硬门槛：至少 18 份达到可发送标准，所有数字必须关联原文位置 [finance-f12]。分母、统计周期与排除规则须由业务负责人书面固定 [finance-f53]。样本不足，暂不给出比率。'
  },
  {
    key: 'reviewTime',
    label: '复核时长（4 小时 → 30 分钟）',
    basisFixed: false,
    basisOwner: 'rachel',
    sampleCount: 0,
    sampleTarget: 20,
    value: null,
    note: '口径未定：只算数字核对，还是含 Q&A 指引变化与异常处理 [finance-f13]。无单量与耗时样本，不能凭印象给数 [finance-r1]。'
  },
  {
    key: 'coverage',
    label: '覆盖与耗时基线',
    basisFixed: false,
    basisOwner: 'david',
    sampleCount: 0,
    sampleTarget: 5,
    value: null,
    note: '覆盖约 80 家公司 × 5 名资深分析师，属团队总量 [finance-f20]；原始简报「每人 1280 小时」口径有冲突，须按人员分工重算 [finance-f22]。'
  },
  {
    key: 'dualReview',
    label: '双审通过率',
    basisFixed: false,
    basisOwner: 'mei',
    sampleCount: 2,
    sampleTarget: 20,
    value: null,
    note: '试点是否所有笔记都走双审，还是仅高风险笔记，尚未核实 [finance-r4]。'
  },
  {
    key: 'feedbackTat',
    label: '反馈受理时效',
    basisFixed: false,
    basisOwner: 'carmen',
    sampleCount: 0,
    sampleTarget: 20,
    value: null,
    note: '反馈须关联原业务编号与资料版本，由 Carmen 受理、David 核实 [finance-f54]；受理时效与反馈量由谁统计、按什么周期汇总到每周复盘尚未核实 [finance-r5]。'
  }
]

export const COST_LINES: CostLine[] = [
  { key: 'integration', label: '接口与集成', amount: 95000, note: 'Snowflake / Python / Bloomberg / FactSet 只读集成', excludedFromSaving: false },
  { key: 'training', label: '分析师培训', amount: 40000, note: '现场使用现有终端，不换设备 [finance-f13]', excludedFromSaving: false },
  { key: 'review', label: '复核工时增量', amount: 70000, note: '并行试点期间人工流程照常运转 [finance-f05]', excludedFromSaving: false },
  { key: 'maintenance', label: '后续维护', amount: 45000, note: '上线需明确工程维护负责人 [finance-f32]', excludedFromSaving: false },
  { key: 'existing', label: '既有系统采购', amount: null, note: '不纳入节省额 [finance-f03]', excludedFromSaving: true }
]

export const PILOT_BUDGET = 250000

/* ------------------------------------------------------------------ *
 * 范围红线与停止条件
 * ------------------------------------------------------------------ */

export const STOP_CONDITIONS = [
  '虚构数字流入交易决策 → 立即终止试点，不是扣分项 [finance-f02]',
  '非公开重大信息进入模型 → 立即终止试点 [finance-f02]'
]

export const SCOPE_BOUNDARIES = [
  '首期只覆盖标准格式财报后一页研究草稿，先历史回放、再并行试点 [finance-f05]',
  '只生成研究侧草稿，不能访问交易下单接口 [finance-f32]',
  '不提供自动交易与仓位建议，目标是可信的财报后一页笔记 [finance-f52]',
  '流程不变：研究草稿 → 分析师复核 → 合规审批 → 交易侧接收，不能自动发布 [finance-f01]',
  '每份发布笔记由分析师与合规共同审核，不得出现仓位建议或并购猜测 [finance-f41]'
]

export const NEXT_QUESTIONS = [
  '试点阶段是否所有笔记都走双审，还是仅高风险笔记？[finance-r4]',
  '兜底触发后由 Rachel 直接接手，还是先经 David 分派？是否必须携带原文片段？[finance-r4]',
  '人工修正是否强制填写原因？版本链在现有系统中如何呈现，谁能查看完整日志？[finance-r4]',
  '「20 份样稿至少 18 份可发送」的分母、统计周期与排除规则由谁签字固定？[finance-f53]',
  '交接必填字段清单由谁定稿？接手人确认动作在哪个系统留痕？[finance-f23]',
  '实际值、共识值、差值的口径争议，核实责任在 David 还是分析师本人？[finance-r5]',
  '按人员分工重算的覆盖与耗时基线何时可提供？[finance-f22]'
]
