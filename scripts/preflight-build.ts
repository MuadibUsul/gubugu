/**
 * 构建前置检查：把「数据库不可用」从一段吓人的查询堆栈，变成一句说得清的结论。
 *
 * 背景：数据库驱动页面是运行时动态渲染的，因此数据库离线时仍能完成打包。生产
 * 实例会通过 readiness 暴露数据库故障，页面请求也会进入 5xx 错误边界；只有本地
 * 开发且未配置 DATABASE_URL 时允许展示空态。
 *
 * 这里不让普通本地打包失败；发布 CI 会另外在真实 PostgreSQL 上执行同一构建。
 */

import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

// 必须和 next build 读到同一份环境变量，否则预检会对着空环境下结论、和随后真正
// 的构建说两套话。Next 在生产构建时按 .env.production.local → .env.local →
// .env.production → .env 依次加载，先到先得；dotenv 默认不覆盖已有值，所以按同样
// 顺序调用即可复现优先级。
for (const path of [
  '.env.production.local',
  '.env.local',
  '.env.production',
  '.env',
]) {
  loadEnv({ path, override: false, quiet: true });
}

const DATABASE_DEPENDENT_ROUTES = [
  '/            首页各栏（轮播、换谷市场、热门作品、最近收录）',
  '/search      谷库搜索与筛选项',
  '/leaderboard 各维度排行榜',
  '/ips/*       作品、系列与角色页',
  '/goods/*     SKU 图鉴与分享卡',
];

/** 终端里 CJK 占两列，按码点对齐会让边框参差。 */
function displayWidth(text: string) {
  let width = 0;

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    const isWide =
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6);
    width += isWide ? 2 : 1;
  }

  return width;
}

function banner(lines: string[]) {
  const width = Math.max(...lines.map(displayWidth));
  const rule = '─'.repeat(width + 2);

  console.log(`┌${rule}┐`);
  for (const line of lines) {
    console.log(`│ ${line}${' '.repeat(width - displayWidth(line))} │`);
  }
  console.log(`└${rule}┘`);
}

async function probeDatabase(url: string) {
  const client = new Client({
    connectionString: url,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('select 1');
    return { reachable: true as const };
  } catch (error) {
    return {
      reachable: false as const,
      reason: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    banner([
      '构建模式：无数据库（CI 的正常模式）',
      '',
      '以下动态页面需要在运行时连接数据库：',
      ...DATABASE_DEPENDENT_ROUTES,
      '',
      '本地开发会显示空态；生产 readiness 会在数据库不可用时返回 503。',
    ]);
    return;
  }

  const probe = await probeDatabase(databaseUrl);

  if (probe.reachable) {
    banner(['构建模式：数据库可用，页面将带真实数据预渲染']);
    return;
  }

  // 配了地址却连不上：允许本地验证打包；发布 CI 会在数据库任务中直接失败。
  banner([
    '构建模式：已配置 DATABASE_URL，但连不上',
    '',
    `地址：${databaseUrl.replace(/:\/\/[^@]*@/, '://***@')}`,
    `原因：${probe.reason}`,
    '',
    '构建会继续；以下动态页面在数据库恢复前不可用：',
    ...DATABASE_DEPENDENT_ROUTES,
    '',
    '如果这是部署构建，请先修好数据库连通性再发布。',
  ]);
}

main().catch((error) => {
  // 预检本身出问题不该挡住构建。
  console.warn('构建前置检查未能完成，跳过：', error);
});
