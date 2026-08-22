export type CharacterPageControls = {
  ipSlug: string;
  characterSlug: string;
  view: 'goods' | 'progress';
  goodsType?: string;
  seriesSlug?: string;
  tagSlugs: string[];
  collected?: 'owned' | 'missing';
};

export function buildCharacterEncyclopediaHref({
  ipSlug,
  characterSlug,
  view,
  goodsType,
  seriesSlug,
  tagSlugs,
  collected,
}: CharacterPageControls) {
  const params = new URLSearchParams();

  if (view !== 'goods') {
    params.set('view', view);
  }

  if (goodsType) {
    params.set('goodsType', goodsType);
  }

  if (seriesSlug) {
    params.set('series', seriesSlug);
  }

  for (const tagSlug of tagSlugs) {
    params.append('tag', tagSlug);
  }

  if (collected) {
    params.set('collected', collected);
  }

  const queryString = params.toString();
  const pathname = `/ips/${ipSlug}/characters/${characterSlug}`;

  return queryString ? `${pathname}?${queryString}` : pathname;
}

export function formatGoodsTypeLabel(goodsType: string) {
  return goodsType
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
