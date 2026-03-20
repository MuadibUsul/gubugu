import { z } from 'zod';

const supabaseAuthEnvSchema = z.object({
  url: z.url(),
  anonKey: z.string().min(1),
});

export type SupabaseAuthConfig = z.infer<typeof supabaseAuthEnvSchema>;

function readSupabaseAuthEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL,
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.SUPABASE_ANON_KEY,
  };
}

export function getSupabaseAuthConfig() {
  const result = supabaseAuthEnvSchema.safeParse(readSupabaseAuthEnv());

  if (!result.success) {
    return null;
  }

  return result.data;
}

export function requireSupabaseAuthConfig() {
  const config = getSupabaseAuthConfig();

  if (!config) {
    throw new Error(
      'Supabase Auth 依赖 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY（或对应的服务端兜底变量）。',
    );
  }

  return config;
}
