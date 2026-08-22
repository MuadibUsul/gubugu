import type { DemoViewerKey } from '@/lib/config/demo-viewers';

type LocalDemoAdminRole = 'moderator' | 'admin';

export const localDemoAuthEmailByKey = {
  collector: 'collector@local.demo',
  trader: 'trader@local.demo',
  reviewer: 'reviewer@local.demo',
} satisfies Record<DemoViewerKey, string>;

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
