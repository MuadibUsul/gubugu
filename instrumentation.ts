export async function register() {
  // Validating here rather than at module scope in next.config.mjs keeps the
  // check in the runtime that actually reads the variables, and skips it on
  // the edge runtime where the server-only names are not available.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { env } = await import('./server/env');

    if (env.RECOGNITION_WARMUP === '1') {
      const { warmEmbeddingPipeline } =
        await import('./server/recognition/embedding');
      await warmEmbeddingPipeline();
    }

    if (env.CATALOG_CRAWLER_SCHEDULER === '1') {
      const { startCatalogCrawlerScheduler } =
        await import('./server/catalog-crawler/scheduler');
      startCatalogCrawlerScheduler();
    }
  }
}
