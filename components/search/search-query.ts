export type SearchPageControls = {
  query?: string;
  tagSlugs: string[];
  goodsType?: string;
  ipSlug?: string;
  characterSlug?: string;
  seriesSlug?: string;
  page: number;
};

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

export function formatGoodsTypeLabel(goodsType: string) {
  const goodsTypeLabelMap: Record<string, string> = {
    'acrylic-stand': '亚克力立牌',
    'can-badge': '徽章',
    'mini-shikishi': '迷你色纸',
    'clear-card': '透卡',
    keychain: '挂件',
    poster: '海报',
    paper: '纸制品',
    plush: '玩偶',
  };

  return (
    goodsTypeLabelMap[goodsType] ??
    goodsType.split(/[-_]/g).filter(Boolean).join(' / ')
  );
}
