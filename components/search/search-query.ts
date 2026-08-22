export type SearchPageControls = {
  query?: string;
  tagSlugs: string[];
  goodsType?: string;
  ipSlug?: string;
  characterSlug?: string;
  seriesSlug?: string;
  page: number;
};

export { formatGoodsTypeLabel } from '@/lib/catalog-labels';

export function buildSearchHref({
  query,
  tagSlugs,
  goodsType,
  ipSlug,
  characterSlug,
  seriesSlug,
  page,
}: Omit<SearchPageControls, 'page'> & { page?: number }) {
  const params = new URLSearchParams();

  if (query) {
    params.set('query', query);
  }

  if (goodsType) {
    params.set('goodsType', goodsType);
  }

  if (ipSlug) {
    params.set('ipSlug', ipSlug);
  }

  if (characterSlug) {
    params.set('characterSlug', characterSlug);
  }

  if (seriesSlug) {
    params.set('seriesSlug', seriesSlug);
  }

  for (const tagSlug of tagSlugs) {
    params.append('tag', tagSlug);
  }

  if (page && page > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();

  return queryString ? `/search?${queryString}` : '/search';
}
