export const demoViewers = {
  collector: {
    label: '收藏者视角',
    displayName: 'Mika Archive',
    handle: '@mika.collects',
    userId: '20000000-0000-4000-8000-000000000001',
    bio: '偏好完整角色线和适合陈列的亚克力制品，通常会先点亮整套，再去追活动限定补件。',
    city: '杭州',
    visibilityMode: 'public-demo',
    accentTitle: '补全优先收藏架',
  },
  trader: {
    label: '交换者视角',
    displayName: 'Ren Swap Desk',
    handle: '@renswap',
    userId: '20000000-0000-4000-8000-000000000002',
    bio: '会把重复抽到的谷物整理清楚，偏好明确的一换一目标，而不是开放式闲聊式交易。',
    city: '上海',
    visibilityMode: 'public-demo',
    accentTitle: '可交换重复库存',
  },
  reviewer: {
    label: '评测者视角',
    displayName: 'Aster Shelf Notes',
    handle: '@aster.notes',
    userId: '20000000-0000-4000-8000-000000000003',
    bio: '会认真记录印刷、材质和上架观感，再留下笔记和评分，帮助后来的收藏者做判断。',
    city: '苏州',
    visibilityMode: 'public-demo',
    accentTitle: '材质优先笔记',
  },
} as const;

export const defaultDemoViewerKey = 'collector';

export type DemoViewerKey = keyof typeof demoViewers;
export type DemoViewerProfile = (typeof demoViewers)[DemoViewerKey];

export const demoViewerEntries = Object.entries(demoViewers);

export function findDemoViewerKeyByUserId(userId: string) {
  const matched = demoViewerEntries.find(
    ([, profile]) => profile.userId === userId,
  );

  return matched?.[0] as DemoViewerKey | undefined;
}

export function getDemoViewerByUserId(userId: string) {
  const key = findDemoViewerKeyByUserId(userId);

  return key ? demoViewers[key] : null;
}
