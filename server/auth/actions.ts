'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { isLocalDemoViewerKey } from '@/lib/auth/local-demo';
import { getSupabaseAuthConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  clearLocalDemoAuthSession,
  setLocalDemoAuthSession,
} from '@/server/auth/local-session';
import type { SignInActionState } from '@/server/auth/action-state';

const localDemoSignInInputSchema = z.object({
  demoViewerKey: z.string().trim().min(1),
  next: z.string().trim().optional(),
});

function normalizeNextPath(nextPath?: string) {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/';
  }

  return nextPath;
}

export async function signInAction(
  _previousState: SignInActionState,
  formData: FormData,
): Promise<SignInActionState> {
  const signInInputSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(6),
    next: z.string().trim().optional(),
  });

  if (!getSupabaseAuthConfig()) {
    const parsed = localDemoSignInInputSchema.safeParse({
      demoViewerKey: formData.get('demoViewerKey'),
      next: formData.get('next'),
    });

    if (!parsed.success || !isLocalDemoViewerKey(parsed.data.demoViewerKey)) {
      return {
        status: 'error',
        message: '请选择一个收藏档案后再继续。',
      };
    }

    await setLocalDemoAuthSession(parsed.data.demoViewerKey);
    redirect(normalizeNextPath(parsed.data.next));
  }

  const parsed = signInInputSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next'),
  });

  if (!parsed.success) {
    return {
      status: 'error',
      message: '请输入有效邮箱和不少于 6 位的密码。',
    };
  }

  const supabase = await createServerSupabaseClient();
  const { email, password, next } = parsed.data;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      status: 'error',
      message: '登录失败，请检查邮箱、密码以及当前账户配置。',
    };
  }

  redirect(normalizeNextPath(next));
}

export async function signOutAction() {
  if (getSupabaseAuthConfig()) {
    const supabase = await createServerSupabaseClient();

    await supabase.auth.signOut();
  } else {
    await clearLocalDemoAuthSession();
  }

  redirect('/');
}
