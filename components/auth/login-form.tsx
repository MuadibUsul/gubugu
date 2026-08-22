'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { initialAuthActionState } from '@/server/auth/action-state';
import { registerAction, signInAction } from '@/server/auth/actions';

type LoginFormProps = {
  nextPath: string;
  authMode: 'supabase' | 'local';
  routeError?: string;
};

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} size="lg" type="submit">
      {pending ? pendingLabel : label}
    </Button>
  );
}

function AuthMessage({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      aria-live="polite"
      className="border-destructive/28 bg-destructive/7 text-muted-foreground rounded-[var(--radius)] border px-4 py-3 text-sm leading-7"
      role="alert"
    >
      {message}
    </div>
  );
}

function CredentialsFields() {
  return (
    <>
      <label className="block space-y-2 text-sm">
        <span className="text-muted-foreground block">邮箱</span>
        <input
          autoComplete="email"
          className="ui-field h-12 px-4"
          maxLength={320}
          name="email"
          placeholder="name@example.com"
          required
          type="email"
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span className="text-muted-foreground block">密码</span>
        <input
          autoComplete="current-password"
          className="ui-field h-12 px-4"
          maxLength={128}
          minLength={8}
          name="password"
          placeholder="至少 8 位"
          required
          type="password"
        />
      </label>
    </>
  );
}

export function LoginForm({ nextPath, authMode, routeError }: LoginFormProps) {
  const [signInState, signInFormAction] = useActionState(
    signInAction,
    initialAuthActionState,
  );
  const [registerState, registerFormAction] = useActionState(
    registerAction,
    initialAuthActionState,
  );
  const signInMessage =
    routeError || (signInState.status === 'error' ? signInState.message : null);

  return (
    <div className="space-y-5">
      <form action={signInFormAction} className="space-y-4">
        <input name="next" type="hidden" value={nextPath} />
        <CredentialsFields />
        <AuthMessage message={signInMessage} />
        <SubmitButton label="登录" pendingLabel="登录中…" />
      </form>

      {authMode === 'local' ? (
        <>
          <p className="text-muted-foreground text-xs leading-6">
            本地测试账号：collector@local.demo / gubugu-demo
          </p>
          <details className="border-border border-t pt-5">
            <summary className="cursor-pointer text-sm font-medium">
              没有账号？创建本地账号
            </summary>
            <form action={registerFormAction} className="mt-5 space-y-4">
              <input name="next" type="hidden" value={nextPath} />
              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground block">展示名</span>
                <input
                  autoComplete="name"
                  className="ui-field h-12 px-4"
                  maxLength={120}
                  name="displayName"
                  placeholder="你的收藏档案名称"
                  required
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="text-muted-foreground block">英文用户名</span>
                <input
                  autoCapitalize="none"
                  autoComplete="username"
                  className="ui-field h-12 px-4"
                  maxLength={64}
                  minLength={2}
                  name="handle"
                  pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                  placeholder="例如 mika.collects"
                  required
                />
              </label>
              <CredentialsFields />
              <AuthMessage
                message={
                  registerState.status === 'error'
                    ? registerState.message
                    : null
                }
              />
              <SubmitButton label="注册并登录" pendingLabel="创建中…" />
            </form>
          </details>
        </>
      ) : null}
    </div>
  );
}
