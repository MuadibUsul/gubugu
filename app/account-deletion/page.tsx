import type { Metadata } from 'next';
import Link from 'next/link';

import { getAuthUser } from '@/server/auth/session';

export const metadata: Metadata = {
  title: '删除账号',
  description: '申请永久删除谷布谷账号和关联数据。',
};

export default async function AccountDeletionPage() {
  const user = await getAuthUser();

  return (
    <main className="mx-auto w-full max-w-[680px] px-5 py-10 pb-24 sm:px-8">
      <p className="section-kicker">数据权利</p>
      <h1 className="mt-3 text-4xl">删除谷布谷账号</h1>
      <div className="panel mt-8 space-y-5 p-6 text-sm leading-7">
        <p>
          删除后，登录凭据、个人资料、收藏、扫描、评论、评分、私信、关注及换谷记录会被永久清理，且无法恢复。
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>{user ? '打开账号设置。' : '登录需要删除的账号。'}</li>
          <li>滚动到“危险操作”。</li>
          <li>输入当前密码和确认文字，提交永久删除。</li>
        </ol>
        <Link
          className="inline-flex rounded-[var(--radius)] bg-[var(--shu)] px-5 py-2.5 font-semibold text-white"
          href={user ? '/me/profile' : '/login?next=%2Fme%2Fprofile'}
        >
          {user ? '前往账号设置' : '登录并继续'}
        </Link>
        <p className="text-muted-foreground">
          如果无法登录，正式发布前需由运营方在此补充可用的人工删除申请邮箱。
        </p>
      </div>
      <Link
        className="mt-6 inline-block text-sm text-[var(--shu)]"
        href="/privacy"
      >
        查看隐私政策 →
      </Link>
    </main>
  );
}
