import { buildDemoAssetUrl } from '@/lib/demo-assets';
import type { RecognitionCandidate } from '@/lib/recognition';

const mockCatalogCandidates = [
  {
    slug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
    skuCode: 'NR-SBF-2026-001',
    name: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
    goodsType: 'acrylic-stand',
    seriesName: '2026 Spring Bloom Fair',
    ipName: 'Neon Requiem',
    characterNames: ['Aoi Tsukishiro'],
    material: 'Acrylic',
    sizeLabel: 'H150mm',
    edition: 'Venue and web lottery',
    primaryImageUrl: buildDemoAssetUrl(
      'neon-requiem/goods/aoi-stand/front.svg',
      {
        absolute: true,
      },
    ),
  },
  {
    slug: 'ren-kagetsu-spring-bloom-glitter-can-badge',
    skuCode: 'NR-SBF-2026-002',
    name: 'Ren Kagetsu Glitter Can Badge - Spring Bloom Ver.',
    goodsType: 'can-badge',
    seriesName: '2026 Spring Bloom Fair',
    ipName: 'Neon Requiem',
    characterNames: ['Ren Kagetsu'],
    material: 'Tinplate',
    sizeLabel: '56mm',
    edition: 'Blind pack',
    primaryImageUrl: buildDemoAssetUrl(
      'neon-requiem/goods/ren-badge/front.svg',
      {
        absolute: true,
      },
    ),
  },
  {
    slug: 'aoi-ren-spring-bloom-foil-mini-shikishi',
    skuCode: 'NR-SBF-2026-003',
    name: 'Aoi and Ren Foil Mini Shikishi - Spring Bloom Ver.',
    goodsType: 'mini-shikishi',
    seriesName: '2026 Spring Bloom Fair',
    ipName: 'Neon Requiem',
    characterNames: ['Aoi Tsukishiro', 'Ren Kagetsu'],
    material: 'Paperboard',
    sizeLabel: '135mm x 120mm',
    edition: 'Venue exclusive',
    primaryImageUrl: buildDemoAssetUrl(
      'neon-requiem/goods/duo-shikishi/front.svg',
      {
        absolute: true,
      },
    ),
  },
  {
    slug: 'aoi-tsukishiro-spring-bloom-clear-card',
    skuCode: 'NR-SBF-2026-004',
    name: 'Aoi Tsukishiro Foil Clear Card - Spring Bloom Ver.',
    goodsType: 'clear-card',
    seriesName: '2026 Spring Bloom Fair',
    ipName: 'Neon Requiem',
    characterNames: ['Aoi Tsukishiro'],
    material: 'PET',
    sizeLabel: '63mm x 88mm',
    edition: 'Venue limited',
    primaryImageUrl: buildDemoAssetUrl(
      'neon-requiem/goods/aoi-clear-card/front.svg',
      {
        absolute: true,
      },
    ),
  },
  {
    slug: 'ren-kagetsu-spring-bloom-ribbon-keychain',
    skuCode: 'NR-SBF-2026-005',
    name: 'Ren Kagetsu Ribbon Keychain - Spring Bloom Ver.',
    goodsType: 'keychain',
    seriesName: '2026 Spring Bloom Fair',
    ipName: 'Neon Requiem',
    characterNames: ['Ren Kagetsu'],
    material: 'Polyester and zinc alloy',
    sizeLabel: 'W40mm x H120mm',
    edition: 'Event pickup',
    primaryImageUrl: buildDemoAssetUrl(
      'neon-requiem/goods/ren-keychain/front.svg',
      {
        absolute: true,
      },
    ),
  },
] as const;

export function buildMockRecognitionCandidates(file: File) {
  const fingerprint = `${file.name}:${file.type}:${file.size}`.toLowerCase();

  if (
    fingerprint.includes('unknown') ||
    fingerprint.includes('nomatch') ||
    fingerprint.includes('empty')
  ) {
    return [];
  }

  const ordered =
    fingerprint.includes('badge') || fingerprint.includes('circle')
      ? [
          mockCatalogCandidates[1],
          mockCatalogCandidates[4],
          mockCatalogCandidates[0],
          mockCatalogCandidates[2],
          mockCatalogCandidates[3],
        ]
      : fingerprint.includes('paper') || fingerprint.includes('shikishi')
        ? [
            mockCatalogCandidates[2],
            mockCatalogCandidates[3],
            mockCatalogCandidates[0],
            mockCatalogCandidates[1],
            mockCatalogCandidates[4],
          ]
        : fingerprint.includes('card') || fingerprint.includes('foil')
          ? [
              mockCatalogCandidates[3],
              mockCatalogCandidates[2],
              mockCatalogCandidates[0],
              mockCatalogCandidates[1],
              mockCatalogCandidates[4],
            ]
          : mockCatalogCandidates;

  const isWeakSignal =
    fingerprint.includes('weak') ||
    fingerprint.includes('blur') ||
    fingerprint.includes('dark') ||
    fingerprint.includes('crop') ||
    fingerprint.includes('partial');

  const baseScores = isWeakSignal
    ? [0.61, 0.56, 0.49, 0.43, 0.38]
    : [0.92, 0.84, 0.76, 0.67, 0.58];

  return ordered.map(
    (goods, index) =>
      ({
        id: `mock-${goods.slug}`,
        rank: index + 1,
        score: baseScores[index] ?? 0.5,
        matchReason:
          index === 0
            ? '主体轮廓、配色与版式更接近该商品图鉴。'
            : '可继续结合材质、尺寸与版本信息辅助比对。',
        goods: {
          slug: goods.slug,
          skuCode: goods.skuCode,
          name: goods.name,
          goodsType: goods.goodsType,
          seriesName: goods.seriesName,
          ipName: goods.ipName,
          characterNames: [...goods.characterNames],
          material: goods.material,
          sizeLabel: goods.sizeLabel,
          edition: goods.edition,
          primaryImageUrl: goods.primaryImageUrl,
        },
        similarity: {
          matchedGoodsImageId: null,
          matchedImageUrl: goods.primaryImageUrl,
          score: baseScores[index] ?? 0.5,
          distance: Number((1 - (baseScores[index] ?? 0.5)).toFixed(4)),
          metric: 'cosine',
          embedding: {
            status: null,
            provider: null,
            model: null,
            modelVersion: null,
            dimensions: null,
            indexedAt: null,
          },
        },
      }) satisfies RecognitionCandidate,
  );
}
