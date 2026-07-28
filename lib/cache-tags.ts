/**
 * Cache tags for the encyclopedia read path.
 *
 * Server actions previously invalidated by listing paths by hand, which meant
 * every new route that showed a SKU had to be remembered in several actions.
 * Tagging the data instead keeps invalidation next to what changed.
 *
 * `catalogCacheTag` is the coarse one: admin edits to IP, character, series or
 * goods records are rare and can afford to drop the whole encyclopedia cache.
 * The per-entity tags exist for the frequent, narrow cases — a rating, a note,
 * an exchange listing — where dropping everything would be wasteful.
 */
export const catalogCacheTag = 'catalog';

export function goodsCacheTag(goodsSlug: string) {
  return `goods:${goodsSlug}`;
}

export function ipCacheTag(ipSlug: string) {
  return `ip:${ipSlug}`;
}

export function characterCacheTag(ipSlug: string, characterSlug: string) {
  return `character:${ipSlug}/${characterSlug}`;
}

export function seriesCacheTag(ipSlug: string, seriesSlug: string) {
  return `series:${ipSlug}/${seriesSlug}`;
}
