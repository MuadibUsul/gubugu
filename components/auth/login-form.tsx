'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { localDemoAuthOptions } from '@/lib/auth/local-demo';
import { initialSignInActionState } from '@/server/auth/action-state';
import { signInAction } from '@/server/auth/actions';

type LoginFormProps = {
  nextPath: string;
  authMode: 'supabase' | 'local-demo';
  routeError?: string;
};

function PasswordSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? '登录中...' : '登录'}
    </Button>
  );
}

function LocalDemoSubmitButton({ demoViewerKey }: { demoViewerKey: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={pending}
      name="demoViewerKey"
      type="submit"
      value={demoViewerKey}
    >
      {pending ? '进入中...' : '进入这个收藏册'}
    </Button>
  );
}

export function LoginForm({ nextPath, authMode, routeError }: LoginFormProps) {
  const [state, formAction] = useActionState(
    signInAction,
    initialSignInActionState,
  );
  const message =
    routeError || (state.status === 'error' ? state.message : null);

  if (authMode === 'local-demo') {
    return (
      <div className="space-y-5">
        {message ? (
          <div className="border-destructive/28 bg-destructive/7 text-muted-foreground rounded-[var(--radius)] border px-4 py-3 text-sm leading-7">
            {message}
          </div>
        ) : null}

        <div className="grid gap-3">
          {localDemoAuthOptions.map((option) => (
            <form action={formAction} className="hud-card p-4" key={option.key}>
              <input name="next" type="hidden" value={nextPath} />
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-foreground text-base font-semibold">
                      {option.displayName}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {option.handle}
                    </p>
                  </div>
                  <span className="hud-chip text-muted-foreground px-3 py-1 text-[0.68rem] font-semibold uppercase">
                    {option.roleLabel}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-[0.68rem] font-semibold uppercase">
                    {option.title}
                  </p>
                  <p className="text-muted-foreground text-sm leading-7">
                    {option.description}
                  </p>
                  <p className="text-foreground text-sm">
                    {option.accentTitle}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <LocalDemoSubmitButton demoViewerKey={option.key} />
                  <span className="hud-chip text-muted-foreground inline-flex h-11 items-center justify-center px-4 text-sm">
                    收藏档案
                  </span>
                </div>
              </div>
            </form>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input name="next" type="hidden" value={nextPath} />

      <div className="space-y-3">
        <label
          className="text-muted-foreground block text-[0.72rem] font-semibold uppercase"
          htmlFor="login-email"
        >
          邮箱
        </label>
        <input
          autoComplete="email"
          className="ui-field h-12 px-4"
          id="login-email"
          name="email"
          placeholder="name@example.com"
          type="email"
        />
      </div>

      <div className="space-y-3">
        <label
          className="text-muted-foreground block text-[0.72rem] font-semibold uppercase"
          htmlFor="login-password"
        >
          密码
        </label>
        <input
          autoComplete="current-password"
          className="ui-field h-12 px-4"
          id="login-password"
          name="password"
          placeholder="至少 6 个字符"
          type="password"
        />
      </div>

      {message ? (
        <div className="border-destructive/28 bg-destructive/7 text-muted-foreground rounded-[var(--radius)] border px-4 py-3 text-sm leading-7">
          {message}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <PasswordSubmitButton />
        <span className="hud-chip text-muted-foreground inline-flex h-12 items-center justify-center px-4 text-sm">
          邮箱密码登录
        </span>
      </div>
    </form>
  );
}
