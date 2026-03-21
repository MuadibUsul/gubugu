export type CharacterPageControls = {
  ipSlug: string;
  characterSlug: string;
  view: 'goods' | 'progress';
  goodsType?: string;
  seriesSlug?: string;
  tagSlugs: string[];
  ownedOnly: boolean;
  viewer: string;
};

export function buildCharacterEncyclopediaHref({
  ipSlug,
  characterSlug,
  view,
  goodsType,
  seriesSlug,
  tagSlugs,
  ownedOnly,
  viewer,
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

  if (ownedOnly) {
    params.set('owned', '1');
  }

  if (viewer) {
    params.set('viewer', viewer);
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
