import 'server-only';

import { demoViewers } from '@/lib/config/demo-viewers';
import { canViewProfile } from '@/lib/profile-visibility';
import { isFollowing } from '@/server/data/follows';
import { getProfileByHandle, type ProfileDetail } from '@/server/data/profiles';
import { isDatabaseAccessConfigurationError } from '@/server/db/client';

// Before profiles existed these pages were addressed by demo viewer key
// (/users/collector). Those URLs still resolve so existing links do not break,
// but the handle is the canonical address.
export function resolveDemoViewerFallback(handle: string): ProfileDetail | null {
  const viewer =
    handle in demoViewers
      ? demoViewers[handle as keyof typeof demoViewers]
      : Object.values(demoViewers).find(
          (candidate) => candidate.handle.replace(/^@/, '') === handle,
        );

  if (!viewer) {
    return null;
  }

  return {
    userId: viewer.userId,
    handle: viewer.handle.replace(/^@/, ''),
    displayName: viewer.displayName,
    avatarImageUrl: null,
    bio: viewer.bio,
    city: viewer.city,
    accentTitle: viewer.accentTitle,
    visibility: 'public',
    collectionFramesPublic: true,
  };
}

/**
 * Returns a profile only when it is publicly browsable, so a non-public row
 * never enters the component scope and cannot leak through the document title
 * or the RSC payload.
 *
 * followers 资料仅对关注者与本人可见；private 只对本人进入页面组件范围。
 */
export async function resolveBrowsableProfile(
  handle: string,
  viewerId: string | null,
): Promise<ProfileDetail | null> {
  let profile: ProfileDetail | null = null;

  try {
    profile = await getProfileByHandle(handle);
  } catch (error) {
    if (!isDatabaseAccessConfigurationError(error)) {
      throw error;
    }
  }

  profile ??= resolveDemoViewerFallback(handle.replace(/^@/, '').toLowerCase());

  if (!profile) return null;
  const isSelf = profile.userId === viewerId;
  const isFollower = isSelf
    ? false
    : await isFollowing(viewerId, profile.userId);

  return canViewProfile(profile.visibility, { isSelf, isFollower })
    ? profile
    : null;
}
