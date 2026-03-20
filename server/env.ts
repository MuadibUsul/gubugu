import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url(),
});

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_URL: z.url(),
});

function formatIssues(issues: z.ZodIssue[]) {
  return issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n');
}

const publicResult = publicEnvSchema.safeParse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!publicResult.success) {
  throw new Error(
    `Invalid public environment variables.\n${formatIssues(publicResult.error.issues)}`,
  );
}

const serverResult = serverEnvSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL: process.env.SUPABASE_URL,
});

if (!serverResult.success) {
  throw new Error(
    `Invalid server environment variables.\n${formatIssues(serverResult.error.issues)}`,
  );
}

export const publicEnv = publicResult.data;
export const serverEnv = serverResult.data;

export type PublicEnv = typeof publicEnv;
export type ServerEnv = typeof serverEnv;

