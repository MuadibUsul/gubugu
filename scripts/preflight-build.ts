/**
 * 构建前置检查：把「数据库不可用」从一段吓人的查询堆栈，变成一句说得清的结论。
 *
 * 背景：`next build` 会预渲染部分路由，途中真的去查库。数据库连不上时，日志里会
 * 冒出完整的 SQL 和 ECONNREFUSED，但构建照样成功——产物里那些页面是空的。这既
 * 像故障又不是故障，容易掩盖真正的部署问题（见 mobile-first-transformation-plan
 * 第 3.2 节）。
 *
 * 这里不让构建失败：CI 本来就不该有生产库凭据，无库构建是正常且期望的。要做的是
 * 在日志最前面明确说明本次构建处于哪种模式、哪些页面会降级，让后面出现的报错有
 * 上下文可循。
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

// 数据库不可用时会渲染成空态、但仍返回 200 的页面。它们都是运行时按需渲染的，
// 所以生产运行时只要库正常就正常；这里列出来是为了让构建日志自我解释。
const DEGRADES_WITHOUT_DATABASE = [
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
      '未设置 DATABASE_URL，以下页面在本次构建中按空态渲染：',
      ...DEGRADES_WITHOUT_DATABASE,
      '',
      '这不影响运行时——它们都是按需渲染，生产环境连上库即正常。',
      '构建日志里若出现 SQL 相关报错，属于同一原因，可以忽略。',
    ]);
    return;
  }

  const probe = await probeDatabase(databaseUrl);

  if (probe.reachable) {
    banner(['构建模式：数据库可用，页面将带真实数据预渲染']);
    return;
  }

  // 配了地址却连不上：多半是本地开发库没起，或部署配置写错。不让构建失败——CI
  // 之外的场景（如只想验证类型和打包）仍应能构建；但必须说清楚产物会是空的。
  banner([
    '构建模式：已配置 DATABASE_URL，但连不上',
    '',
    `地址：${databaseUrl.replace(/:\/\/[^@]*@/, '://***@')}`,
    `原因：${probe.reason}`,
    '',
    '构建会继续，但以下页面产出空态：',
    ...DEGRADES_WITHOUT_DATABASE,
    '',
    '如果这是部署构建，请先修好数据库连通性再发布。',
  ]);
}

main().catch((error) => {
  // 预检本身出问题不该挡住构建。
  console.warn('构建前置检查未能完成，跳过：', error);
});
