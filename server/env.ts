import { z } from 'zod';

// This module is imported by instrumentation.ts so that a misconfigured
// deployment fails at boot instead of silently degrading:
//
// - without DATABASE_URL every data module falls back to empty state and the
//   site renders a blank encyclopedia with HTTP 200
// - without Supabase auth, signInAction falls back to the hardcoded demo
//   viewers in lib/config/demo-viewers.ts, which sign in without a credential
//   check and map `collector` to the `admin` role
//
// Both fallbacks are deliberate local-development conveniences. Neither may be
// reachable in production.

const nodeEnvSchema = z
  .enum(['development', 'test', 'production'])
  .default('development');

function readOptional(value: string | undefined) {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

const envSchema = z
  .object({
    NODE_ENV: nodeEnvSchema,
    NEXT_PUBLIC_APP_NAME: z.string().min(1).optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
    DATABASE_URL: z.string().min(1).optional(),
    // lib/supabase/config.ts prefers the NEXT_PUBLIC_ variants and falls back
    // to the server-only names, so both spellings are accepted here.
    SUPABASE_URL: z.url().optional(),
    SUPABASE_ANON_KEY: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    const isProduction = value.NODE_ENV === 'production';
    const hasSupabaseUrl = Boolean(value.SUPABASE_URL);
    const hasSupabaseAnonKey = Boolean(value.SUPABASE_ANON_KEY);

    if (isProduction && !value.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          '生产环境必须配置 DATABASE_URL，否则全站会静默渲染空图鉴并返回 200。',
      });
    }

    if (hasSupabaseUrl !== hasSupabaseAnonKey) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_ANON_KEY'],
        message:
          'Supabase URL 与 anon key 必须同时配置；只配一半会静默回退到本地演示登录。',
      });
    }

    if (isProduction && !hasSupabaseUrl) {
      ctx.addIssue({
        code: 'custom',
        path: ['SUPABASE_URL'],
        message:
          '生产环境必须配置 Supabase Auth，否则登录会回退到无凭证校验的演示账号，并直接授予管理员权限。',
      });
    }
  });

function formatIssues(issues: z.core.$ZodIssue[]) {
  return issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
}

const result = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_APP_NAME: readOptional(process.env.NEXT_PUBLIC_APP_NAME),
  NEXT_PUBLIC_APP_URL: readOptional(process.env.NEXT_PUBLIC_APP_URL),
  DATABASE_URL: readOptional(process.env.DATABASE_URL),
  SUPABASE_URL: readOptional(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
  ),
  SUPABASE_ANON_KEY: readOptional(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY,
  ),
  SUPABASE_SERVICE_ROLE_KEY: readOptional(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ),
});

if (!result.success) {
  throw new Error(
    `Invalid environment variables.\n${formatIssues(result.error.issues)}`,
  );
}

export const env = result.data;

export type Env = typeof env;
