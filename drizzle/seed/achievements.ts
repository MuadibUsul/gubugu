/**
 * 収蔵記録的定义。
 *
 * 只围绕收藏本身的节点：累计数量、品类广度、成套补全。点亮才计数，收进谷柜
 * 不算，所以这里的每一枚都对应真实的实物点亮进度，不是登录 / 签到式的活跃机制。
 */
export const achievementSeed = [
  // ── 数量里程碑（累计已点亮件数）──────────────────────────────
  {
    code: 'first-acquisition',
    name: '初次入藏',
    description: '点亮第一件周边',
    kind: 'owned_count' as const,
    threshold: 1,
    sortOrder: 10,
  },
  {
    code: 'owned-5',
    name: '初具规模',
    description: '累计点亮 5 件',
    kind: 'owned_count' as const,
    threshold: 5,
    sortOrder: 20,
  },
  {
    code: 'owned-25',
    name: '渐入佳境',
    description: '累计点亮 25 件',
    kind: 'owned_count' as const,
    threshold: 25,
    sortOrder: 30,
  },
  {
    code: 'owned-100',
    name: '蔚为可观',
    description: '累计点亮 100 件',
    kind: 'owned_count' as const,
    threshold: 100,
    sortOrder: 40,
  },
  {
    code: 'owned-250',
    name: '藏家门第',
    description: '累计点亮 250 件',
    kind: 'owned_count' as const,
    threshold: 250,
    sortOrder: 50,
  },
  {
    code: 'owned-500',
    name: '谷海巨擘',
    description: '累计点亮 500 件',
    kind: 'owned_count' as const,
    threshold: 500,
    sortOrder: 60,
  },
  {
    code: 'owned-1000',
    name: '一柜千谷',
    description: '累计点亮 1000 件',
    kind: 'owned_count' as const,
    threshold: 1000,
    sortOrder: 70,
  },
  // ── 品类广度（覆盖多少种不同的谷子类型）────────────────────────
  {
    code: 'breadth-3',
    name: '博采三类',
    description: '点亮收藏覆盖 3 种品类',
    kind: 'type_breadth' as const,
    threshold: 3,
    sortOrder: 110,
  },
  {
    code: 'breadth-5',
    name: '五类兼收',
    description: '点亮收藏覆盖 5 种品类',
    kind: 'type_breadth' as const,
    threshold: 5,
    sortOrder: 120,
  },
  {
    code: 'breadth-8',
    name: '八方汇聚',
    description: '点亮收藏覆盖 8 种品类',
    kind: 'type_breadth' as const,
    threshold: 8,
    sortOrder: 130,
  },
  // ── 成套补全（集齐一整套）──────────────────────────────────
  {
    code: 'series-complete',
    name: '系列补全',
    description: '集齐一个系列的全部条目',
    kind: 'series_complete' as const,
    threshold: null,
    sortOrder: 210,
  },
  {
    code: 'character-complete',
    name: '角色补全',
    description: '集齐一位角色的全部条目',
    kind: 'character_complete' as const,
    threshold: null,
    sortOrder: 220,
  },
  {
    code: 'ip-complete',
    name: '作品补全',
    description: '集齐一部作品的全部条目',
    kind: 'ip_complete' as const,
    threshold: null,
    sortOrder: 230,
  },
];
