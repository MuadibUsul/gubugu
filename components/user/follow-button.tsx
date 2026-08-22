import { toggleFollowAction } from '@/server/follow/actions';

export function FollowButton({
  followingId,
  isFollowing,
  nextPath,
}: {
  followingId: string;
  isFollowing: boolean;
  nextPath: string;
}) {
  return (
    <form action={toggleFollowAction} className="mt-5">
      <input name="followingId" type="hidden" value={followingId} />
      <input name="nextPath" type="hidden" value={nextPath} />
      <button
        className="rounded-[var(--radius)] border border-[var(--shu)] px-4 py-2 text-sm text-[var(--shu)] hover:bg-[var(--shu)] hover:text-[var(--shu-ink)]"
        type="submit"
      >
        {isFollowing ? '已关注' : '关注收藏者'}
      </button>
    </form>
  );
}
