'use client';

import { useActionState } from 'react';

import type { AuthActionState } from '@/server/auth/action-state';
import { deleteAccountAction } from '@/server/auth/actions';

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccountAction, {
    status: 'idle',
  } satisfies AuthActionState);

  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm">
        当前密码
        <input
          autoComplete="current-password"
          className="ui-field mt-2 w-full px-3 py-2"
          name="password"
          required
          type="password"
        />
      </label>
      <label className="block text-sm">
        输入“删除我的账号”确认
        <input
          autoComplete="off"
          className="ui-field mt-2 w-full px-3 py-2"
          name="confirmation"
          required
        />
      </label>
      {state.status === 'error' ? (
        <p className="text-sm text-[var(--destructive)]" role="alert">
          {state.message}
        </p>
      ) : null}
      <button
        className="rounded-[var(--radius)] border border-[var(--destructive)] px-4 py-2 text-sm font-semibold text-[var(--destructive)] disabled:opacity-50"
        disabled={pending}
        type="submit"
      >
        {pending ? '正在删除…' : '永久删除账号'}
      </button>
    </form>
  );
}
