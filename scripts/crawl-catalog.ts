import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

async function main() {
  const { latestCrawlerScheduleAt } =
    await import('../lib/catalog-crawler/schedule');
  const { runScheduledCrawlerSweep } =
    await import('../server/catalog-crawler/service');
  const { getDbPool } = await import('../server/db/client');

  try {
    await runScheduledCrawlerSweep(latestCrawlerScheduleAt(new Date()));
  } finally {
    await getDbPool().end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
