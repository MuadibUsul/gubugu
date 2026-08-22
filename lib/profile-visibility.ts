export type ProfileVisibility = 'public' | 'followers' | 'private';

export function canViewProfile(
  visibility: ProfileVisibility,
  access: { isSelf: boolean; isFollower: boolean },
) {
  return (
    access.isSelf ||
    visibility === 'public' ||
    (visibility === 'followers' && access.isFollower)
  );
}
