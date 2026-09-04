import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { getLocalAuthUser } from '@/server/auth/local-session';

import type { AuthUser } from './types';

/**
 * 认证完全自托管：账号存在自建 Postgres，会话是 HMAC 签名的 cookie。
 * 解析逻辑都在 local-session 里，这里只负责暴露给页面与 Server Action。
 */
export const getAuthUser = cache(
  async (): Promise<AuthUser | null> => getLocalAuthUser(),
);

export async function requireAuthUser(nextPath = '/') {
  const user = await getAuthUser();

  if (!user) {
    const nextQuery =
      nextPath && nextPath !== '/'
        ? `?next=${encodeURIComponent(nextPath)}`
        : '';

    redirect(`/login${nextQuery}`);
  }

  return user;
}
