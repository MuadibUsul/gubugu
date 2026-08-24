import { notFound } from 'next/navigation';

import { requireAuthUser } from '@/server/auth/session';
import { getProfileByUserId } from '@/server/data/profiles';
import { updateProfileAction } from '@/server/profile/actions';

export default async function ProfileSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuthUser('/me/profile');
  const saved = (await searchParams).saved === '1';
  const profile = await getProfileByUserId(user.id);
  if (!profile) notFound();
  return (
    <main className="mx-auto w-full max-w-[720px] px-5 pt-14 pb-24 md:px-10">
      <section className="border-border border-b pb-10">
        <p className="lbl">资料设置</p>
        <h1 className="mt-3 text-4xl">我的收藏名片</h1>
      </section>
      {saved ? <p className="callout callout--kin mt-6">资料已保存。</p> : null}
      <form action={updateProfileAction} className="panel mt-6 space-y-5 p-5">
        <label className="block text-sm">
          展示名
          <input
            className="border-input bg-background mt-2 w-full rounded border px-3 py-2"
            defaultValue={profile.displayName}
            maxLength={120}
            name="displayName"
            required
          />
        </label>
        <label className="block text-sm">
          简介
          <textarea
            className="border-input bg-background mt-2 min-h-28 w-full rounded border px-3 py-2"
            defaultValue={profile.bio ?? ''}
            maxLength={600}
            name="bio"
          />
        </label>
        <label className="block text-sm">
          城市
          <input
            className="border-input bg-background mt-2 w-full rounded border px-3 py-2"
            defaultValue={profile.city ?? ''}
            maxLength={64}
            name="city"
          />
        </label>
        <label className="block text-sm">
          可见性
          <select
            className="border-input bg-background mt-2 w-full rounded border px-3 py-2"
            defaultValue={profile.visibility}
            name="visibility"
          >
            <option value="public">公开</option>
            <option value="followers">仅关注者</option>
            <option value="private">仅自己</option>
          </select>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            className="border-input mt-0.5 size-4 rounded"
            defaultChecked={profile.collectionFramesPublic}
            name="collectionFramesPublic"
            type="checkbox"
          />
          <span>
            在社交主页显示收藏相框
            <span className="text-muted-foreground mt-0.5 block text-[12.5px]">
              开启后，别人访问你的主页时，已点亮的藏品会按稀有度套上收藏相框。你自己的谷柜始终显示。
            </span>
          </span>
        </label>
        <button
          className="rounded-[var(--radius)] bg-[var(--shu)] px-5 py-2.5 text-sm text-[var(--shu-ink)]"
          type="submit"
        >
          保存资料
        </button>
      </form>
    </main>
  );
}
