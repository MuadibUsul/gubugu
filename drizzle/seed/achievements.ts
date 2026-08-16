/**
 * 収蔵記録的定义。
 *
 * 刻意保持克制：只记录收藏本身的节点，不做连续登录、不做排行。产品定位是
 * 图鉴与收藏工作流，不是engagement 机制。
 */
export const achievementSeed = [
  {
    code: 'first-acquisition',
    name: '初次入藏',
    description: '收录第一件周边',
    kind: 'owned_count' as const,
    threshold: 1,
    sortOrder: 10,
  },
  {
    code: 'owned-5',
    name: '初具规模',
    description: '累计收录 5 件',
    kind: 'owned_count' as const,
    threshold: 5,
    sortOrder: 20,
  },
  {
    code: 'owned-25',
    name: '渐入佳境',
    description: '累计收录 25 件',
    kind: 'owned_count' as const,
    threshold: 25,
    sortOrder: 30,
  },
  {
    code: 'owned-100',
    name: '蔚为可观',
    description: '累计收录 100 件',
    kind: 'owned_count' as const,
    threshold: 100,
    sortOrder: 40,
  },
  {
    code: 'series-complete',
    name: '系列补全',
    description: '集齐一个系列的全部条目',
    kind: 'series_complete' as const,
    threshold: null,
    sortOrder: 50,
  },
  {
    code: 'character-complete',
    name: '角色补全',
    description: '集齐一位角色的全部条目',
    kind: 'character_complete' as const,
    threshold: null,
    sortOrder: 60,
  },
  {
    code: 'ip-complete',
    name: '作品补全',
    description: '集齐一部作品的全部条目',
    kind: 'ip_complete' as const,
    threshold: null,
    sortOrder: 70,
  },
];
