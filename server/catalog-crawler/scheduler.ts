import 'server-only';

import { nextCrawlerScheduleAt } from '@/lib/catalog-crawler/schedule';
import { runScheduledCrawlerSweep } from '@/server/catalog-crawler/service';

const globalForCrawler = globalThis as typeof globalThis & {
  __gubuguCrawlerTimer?: ReturnType<typeof setTimeout>;
};

function scheduleNextRun() {
  const now = new Date();
  const scheduledFor = nextCrawlerScheduleAt(now);
  const delay = Math.max(1_000, scheduledFor.getTime() - now.getTime());

  const timer = setTimeout(async () => {
    try {
      await runScheduledCrawlerSweep(scheduledFor);
    } catch (error) {
      console.error('[catalog-crawler] scheduled sweep failed', error);
    } finally {
      globalForCrawler.__gubuguCrawlerTimer = undefined;
      scheduleNextRun();
    }
  }, delay);

  timer.unref();
  globalForCrawler.__gubuguCrawlerTimer = timer;
}

export function startCatalogCrawlerScheduler() {
  if (!globalForCrawler.__gubuguCrawlerTimer) {
    scheduleNextRun();
  }
}
