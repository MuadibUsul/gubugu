import {
  demoViewers,
  demoViewerEntries,
  type DemoViewerKey,
} from '@/lib/config/demo-viewers';

type LocalDemoAdminRole = 'moderator' | 'admin';

export const localDemoAuthEmailByKey = {
  collector: 'collector@local.demo',
  trader: 'trader@local.demo',
  reviewer: 'reviewer@local.demo',
} satisfies Record<DemoViewerKey, string>;

const typedDemoViewerEntries = demoViewerEntries as Array<
  [DemoViewerKey, (typeof demoViewers)[DemoViewerKey]]
>;

export function getLocalDemoAdminRole(
  viewerKey: DemoViewerKey,
): LocalDemoAdminRole | null {
  if (viewerKey === 'collector') {
    return 'admin';
  }

  if (viewerKey === 'reviewer') {
    return 'moderator';
  }

  return null;
}

export const localDemoAuthOptions = typedDemoViewerEntries.map(
  ([key, viewer]) => ({
    key,
    title: viewer.label,
    displayName: viewer.displayName,
    handle: viewer.handle,
    accentTitle: viewer.accentTitle,
    description:
      key === 'collector'
        ? '偏重成套补全、公开展示与内容整理。'
        : key === 'reviewer'
          ? '偏重评分、留言与细节记录。'
          : '偏重重复品整理与交换意向管理。',
    roleLabel:
      getLocalDemoAdminRole(key) === 'admin'
        ? '内容管理'
        : getLocalDemoAdminRole(key) === 'moderator'
          ? '审核权限'
          : '收藏档案',
  }),
) satisfies Array<{
  key: DemoViewerKey;
  title: string;
  displayName: string;
  handle: string;
  accentTitle: string;
  description: string;
  roleLabel: string;
}>;

export function isLocalDemoViewerKey(value: string): value is DemoViewerKey {
  return Object.prototype.hasOwnProperty.call(demoViewers, value);
}
