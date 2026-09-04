import { z } from 'zod';

// This module is imported by instrumentation.ts so that a misconfigured
// deployment fails at boot instead of silently degrading:
//
// - without DATABASE_URL every data module falls back to empty state and the
//   site renders a blank encyclopedia with HTTP 200
// - 认证完全自托管：账号存在自建 PostgreSQL，会话是 HMAC 签名的 cookie
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
    APP_URL: z.url().optional(),
    NEXT_PUBLIC_APP_URL: z.url().optional(),
    ALLOW_INSECURE_LOCAL_APP_URL: z.enum(['0', '1']).default('0'),
    DATABASE_URL: z.string().min(1).optional(),
    LOCAL_AUTH_SECRET: z.string().min(32).optional(),
    RECOGNITION_WARMUP: z.enum(['0', '1']).default('0'),
    CATALOG_CRAWLER_SCHEDULER: z.enum(['0', '1']).default('1'),
    // 识别分档阈值。留空则用 lib/recognition.ts 的默认值；校准后按环境覆盖，
    // 不必改代码发版。
    RECOGNITION_AUTO_LIGHT_THRESHOLD: z.coerce
      .number()
      .min(0)
      .max(1)
      .optional(),
    RECOGNITION_CANDIDATE_THRESHOLD: z.coerce.number().min(0).max(1).optional(),
    CATALOG_ASSET_DIR: z.string().min(1).default('.data/catalog-assets'),
    USER_SCAN_ASSET_DIR: z.string().min(1).default('.data/user-scans'),
  })
  .superRefine((value, ctx) => {
    const isProduction = value.NODE_ENV === 'production';

    if (isProduction && !value.DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          '生产环境必须配置 DATABASE_URL，否则全站会静默渲染空图鉴并返回 200。',
      });
    }

    if (isProduction && !value.APP_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message:
          '生产环境必须配置 APP_URL，否则分享卡与社交预览会错误指向本机地址。',
      });
    }

    if (isProduction && value.APP_URL) {
      const appUrl = new URL(value.APP_URL);
      const hasOriginExtras = Boolean(
        appUrl.username ||
        appUrl.password ||
        appUrl.pathname !== '/' ||
        appUrl.search ||
        appUrl.hash,
      );
      const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(
        appUrl.hostname,
      );
      const allowsLocalHttp =
        isLoopback && value.ALLOW_INSECURE_LOCAL_APP_URL === '1';

      if (appUrl.protocol !== 'https:' && !allowsLocalHttp) {
        ctx.addIssue({
          code: 'custom',
          path: ['APP_URL'],
          message:
            '生产环境的公开 APP URL 必须使用 HTTPS，系统文件分享需要安全上下文。',
        });
      }

      if (hasOriginExtras) {
        ctx.addIssue({
          code: 'custom',
          path: ['APP_URL'],
          message:
            '生产环境的 APP_URL 必须是纯站点源，不能包含账号、路径、查询参数或片段。',
        });
      }
    }

    // 自动点亮的门槛不能低于候选门槛，否则会出现「分数够自动点亮、却低到进不了
    // 候选」的空档，行为无法解释。
    const autoLight = value.RECOGNITION_AUTO_LIGHT_THRESHOLD;
    const candidate = value.RECOGNITION_CANDIDATE_THRESHOLD;

    if (
      typeof autoLight === 'number' &&
      typeof candidate === 'number' &&
      autoLight < candidate
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['RECOGNITION_AUTO_LIGHT_THRESHOLD'],
        message:
          '自动点亮阈值不能低于候选阈值，否则分档区间会出现无法解释的空档。',
      });
    }

    // 生产环境必须有可用的认证。
    //
    // 本地认证本身是可靠的：scrypt 口令哈希、HMAC 签名的会话 cookie、登录与注册
    // 限流、用固定 dummy hash 做等时比较以防用户枚举，注册 id 走 crypto.randomUUID
    // 因此不可能撞上演示账号的固定 UUID。它唯一的历史隐患是种子里的演示账号
    // （collector@local.demo，口令硬编码在仓库中）会被 lib/admin-access.ts 直接
    // 认成管理员——那两处现已分别按 NODE_ENV 关闭，生产的管理员只认
    // ADMIN_USER_EMAILS / ADMIN_USER_IDS。
    //
    // 但本地认证的会话签名完全依赖 LOCAL_AUTH_SECRET，缺了它 getLocalAuthUser 会
    // 在每个请求上抛错；太短则可被爆破后伪造任意用户的会话。所以这里强制它存在。
    if (isProduction && !value.LOCAL_AUTH_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['LOCAL_AUTH_SECRET'],
        message:
          '生产环境必须为自托管认证设置至少 32 位的 LOCAL_AUTH_SECRET，否则会话签名无从谈起。',
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
  APP_URL: readOptional(process.env.APP_URL),
  NEXT_PUBLIC_APP_URL: readOptional(process.env.NEXT_PUBLIC_APP_URL),
  ALLOW_INSECURE_LOCAL_APP_URL: readOptional(
    process.env.ALLOW_INSECURE_LOCAL_APP_URL,
  ),
  DATABASE_URL: readOptional(process.env.DATABASE_URL),
  LOCAL_AUTH_SECRET: readOptional(process.env.LOCAL_AUTH_SECRET),
  RECOGNITION_WARMUP: readOptional(process.env.RECOGNITION_WARMUP),
  CATALOG_CRAWLER_SCHEDULER: readOptional(
    process.env.CATALOG_CRAWLER_SCHEDULER,
  ),
  RECOGNITION_AUTO_LIGHT_THRESHOLD: readOptional(
    process.env.RECOGNITION_AUTO_LIGHT_THRESHOLD,
  ),
  RECOGNITION_CANDIDATE_THRESHOLD: readOptional(
    process.env.RECOGNITION_CANDIDATE_THRESHOLD,
  ),
  CATALOG_ASSET_DIR: readOptional(process.env.CATALOG_ASSET_DIR),
  USER_SCAN_ASSET_DIR: readOptional(process.env.USER_SCAN_ASSET_DIR),
});

if (!result.success) {
  throw new Error(
    `Invalid environment variables.\n${formatIssues(result.error.issues)}`,
  );
}

export const env = result.data;

export type Env = typeof env;
