'use server';

import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { localAuthAccounts, profiles } from '@/drizzle/schema';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { normalizeInternalPath } from '@/lib/internal-path';
import { consumeServerWrite } from '@/lib/rate-limit';
import type { AuthActionState } from '@/server/auth/action-state';
import {
  clearLocalAuthSession,
  setLocalAuthSession,
} from '@/server/auth/local-session';
import { deleteAccountData } from '@/server/auth/delete-account';
import { getAuthUser } from '@/server/auth/session';
import { getDb } from '@/server/db/client';

const signInInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(8).max(128),
  next: z.string().trim().optional(),
});

const registerInputSchema = signInInputSchema.extend({
  displayName: z.string().trim().min(1).max(120),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/),
});

const deleteAccountInputSchema = z.object({
  password: z.string().min(8).max(128),
  confirmation: z.literal('删除我的账号'),
});

const DUMMY_PASSWORD_HASH =
  'scrypt:gubugu-local-auth-dummy-salt:c78ce8db667741f6edd14f6f36267def95b88c5b7f6fe7d89f2ab019bded543533037e3333c9a3743cd3b225a98acfff6c94a77a8ad4342d0a22b993695cd151';

function authError(message: string): AuthActionState {
  return { status: 'error', message };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  );
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });
  if (!parsed.success) return authError('请输入有效邮箱和 8–128 位密码。');

  const { email, password, next } = parsed.data;
  if (
    !consumeServerWrite(`auth-login:${email}`, {
      limit: 8,
      windowMs: 60_000,
    })
  ) {
    return authError('尝试次数过多，请一分钟后再试。');
  }

  const account = (
    await getDb()
      .select({
        userId: localAuthAccounts.userId,
        passwordHash: localAuthAccounts.passwordHash,
      })
      .from(localAuthAccounts)
      .where(eq(localAuthAccounts.email, email))
      .limit(1)
  )[0];

  // 即使邮箱不存在也要跑一次校验：命中与否耗时一致，否则响应时间会泄露哪些邮箱
  // 已注册。
  const passwordMatches = await verifyPassword(
    password,
    account?.passwordHash ?? DUMMY_PASSWORD_HASH,
  );
  if (!account || !passwordMatches) {
    return authError('邮箱或密码不正确。');
  }

  await setLocalAuthSession(account.userId);
  redirect(normalizeInternalPath(next));
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    displayName: formData.get('displayName'),
    handle: formData.get('handle'),
    next: formData.get('next'),
  });
  if (!parsed.success) {
    return authError('请填写展示名、合法的英文用户名、邮箱和至少 8 位密码。');
  }

  const input = parsed.data;
  if (
    !consumeServerWrite(`auth-register:${input.email}`, {
      limit: 4,
      windowMs: 60_000,
    })
  ) {
    return authError('尝试次数过多，请一分钟后再试。');
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.password);
  try {
    await getDb().transaction(async (tx) => {
      await tx.insert(profiles).values({
        id: userId,
        handle: input.handle,
        displayName: input.displayName,
      });
      await tx.insert(localAuthAccounts).values({
        userId,
        email: input.email,
        passwordHash,
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return authError('该邮箱或用户名已被使用。');
    }
    throw error;
  }

  await setLocalAuthSession(userId);
  redirect(normalizeInternalPath(input.next));
}

export async function signOutAction() {
  await clearLocalAuthSession();

  redirect('/');
}

export async function deleteAccountAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = deleteAccountInputSchema.safeParse({
    password: formData.get('password'),
    confirmation: formData.get('confirmation'),
  });
  if (!parsed.success) return authError('请确认当前密码并输入完整确认文字。');

  const user = await getAuthUser();
  if (!user) return authError('登录已失效，请重新登录。');
  if (
    !consumeServerWrite(`${user.id}:account-delete`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })
  ) {
    return authError('尝试次数过多，请稍后再试。');
  }

  const account = (
    await getDb()
      .select({ passwordHash: localAuthAccounts.passwordHash })
      .from(localAuthAccounts)
      .where(eq(localAuthAccounts.userId, user.id))
      .limit(1)
  )[0];
  if (
    !account ||
    !(await verifyPassword(parsed.data.password, account.passwordHash))
  ) {
    return authError('当前密码不正确。');
  }

  await deleteAccountData(user.id);
  await clearLocalAuthSession();
  redirect('/?accountDeleted=1');
}
