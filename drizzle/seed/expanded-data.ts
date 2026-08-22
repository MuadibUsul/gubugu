import type { InferInsertModel } from 'drizzle-orm';

import { buildDemoAssetUrl } from '../../lib/demo-assets';
import { getLocalSampleImageAsset } from './local-sample-images';
import {
  catalogSubmissions,
  characters,
  goods,
  goodsCharacters,
  goodsImages,
  goodsTags,
  ips,
  postImages,
  posts,
  ratings,
  series,
  tags,
  userGoods,
} from '../schema';
import {
  characterSeed,
  demoUserIds,
  goodsSeed,
  ipSeed,
  seriesSeed,
  tagSeed,
} from './data';

type IpSeed = InferInsertModel<typeof ips>;
type CharacterSeed = InferInsertModel<typeof characters>;
type SeriesSeed = InferInsertModel<typeof series>;
type GoodSeed = InferInsertModel<typeof goods>;
type GoodImageSeed = InferInsertModel<typeof goodsImages>;
type TagSeed = InferInsertModel<typeof tags>;
type GoodTagSeed = InferInsertModel<typeof goodsTags>;
type GoodCharacterSeed = InferInsertModel<typeof goodsCharacters>;
type UserGoodSeed = InferInsertModel<typeof userGoods>;
type CatalogSubmissionSeed = InferInsertModel<typeof catalogSubmissions>;
type PostSeed = InferInsertModel<typeof posts>;
type PostImageSeed = InferInsertModel<typeof postImages>;
type RatingSeed = InferInsertModel<typeof ratings>;

function resolveSeedImageUrl(sampleIndex: number, fallbackAssetPath: string) {
  return (
    getLocalSampleImageAsset(sampleIndex)?.publicPath ??
    buildDemoAssetUrl(fallbackAssetPath)
  );
}

function resolveSeedStoragePath(
  sampleIndex: number,
  fallbackStoragePath: string,
) {
  return (
    getLocalSampleImageAsset(sampleIndex)?.storagePath ?? fallbackStoragePath
  );
}

function getSeedId<T extends { id?: string | null; slug?: string | null }>(
  rows: T[],
  slug: string,
  label: string,
) {
  const row = rows.find((item) => item.slug === slug);

  if (!row?.id) {
    throw new Error(`Missing ${label} seed: ${slug}`);
  }

  return row.id;
}

const baseIds = {
  ipNeon: getSeedId(ipSeed, 'neon-requiem', 'ip'),
  characterAoi: getSeedId(characterSeed, 'aoi-tsukishiro', 'character'),
  characterRen: getSeedId(characterSeed, 'ren-kagetsu', 'character'),
  seriesSpringBloom: getSeedId(seriesSeed, '2026-spring-bloom-fair', 'series'),
  goodsAoiStand: getSeedId(
    goodsSeed,
    'aoi-tsukishiro-spring-bloom-acrylic-stand',
    'goods',
  ),
  goodsDuoShikishi: getSeedId(
    goodsSeed,
    'aoi-ren-spring-bloom-foil-mini-shikishi',
    'goods',
  ),
  tagSpringBloom: getSeedId(tagSeed, 'spring-bloom', 'tag'),
  tagEventLimited: getSeedId(tagSeed, 'event-limited', 'tag'),
  tagDuoArt: getSeedId(tagSeed, 'duo-art', 'tag'),
  tagGlitterFinish: getSeedId(tagSeed, 'glitter-finish', 'tag'),
};

const ids = {
  ipVelvet: '10000000-0000-4000-8000-000000001001',
  ipAurora: '10000000-0000-4000-8000-000000001002',
  characterRio: '10000000-0000-4000-8000-000000001011',
  characterSora: '10000000-0000-4000-8000-000000001012',
  characterYuna: '10000000-0000-4000-8000-000000001013',
  characterKaito: '10000000-0000-4000-8000-000000001014',
  seriesNeonMidnight: '10000000-0000-4000-8000-000000001021',
  seriesVelvetVoltage: '10000000-0000-4000-8000-000000001022',
  seriesVelvetBackstage: '10000000-0000-4000-8000-000000001023',
  seriesAuroraWinter: '10000000-0000-4000-8000-000000001024',
  seriesAuroraStarlight: '10000000-0000-4000-8000-000000001025',
  goodsAoiClearCard: '10000000-0000-4000-8000-000000001031',
  goodsRenKeychain: '10000000-0000-4000-8000-000000001032',
  goodsDuoBromide: '10000000-0000-4000-8000-000000001033',
  goodsRioStand: '10000000-0000-4000-8000-000000001034',
  goodsSoraBadge: '10000000-0000-4000-8000-000000001035',
  goodsRioSoraCardSet: '10000000-0000-4000-8000-000000001036',
  goodsSoraTapestry: '10000000-0000-4000-8000-000000001037',
  goodsRioPassHolder: '10000000-0000-4000-8000-000000001038',
  goodsYunaArtBoard: '10000000-0000-4000-8000-000000001039',
  goodsKaitoBadge: '10000000-0000-4000-8000-000000001040',
  goodsYunaBlock: '10000000-0000-4000-8000-000000001041',
  goodsYunaKaitoPhotoSet: '10000000-0000-4000-8000-000000001042',
  goodsKaitoCharm: '10000000-0000-4000-8000-000000001043',
  tagClearCard: '10000000-0000-4000-8000-000000001051',
  tagKeychain: '10000000-0000-4000-8000-000000001052',
  tagMidnightEncore: '10000000-0000-4000-8000-000000001053',
  tagBromideSet: '10000000-0000-4000-8000-000000001054',
  tagVoltageShift: '10000000-0000-4000-8000-000000001055',
  tagTourLimited: '10000000-0000-4000-8000-000000001056',
  tagPhotoCard: '10000000-0000-4000-8000-000000001057',
  tagBackstagePass: '10000000-0000-4000-8000-000000001058',
  tagTapestry: '10000000-0000-4000-8000-000000001059',
  tagWinterArchive: '10000000-0000-4000-8000-000000001060',
  tagHoloFoil: '10000000-0000-4000-8000-000000001061',
  tagNightSky: '10000000-0000-4000-8000-000000001062',
  tagStarlight: '10000000-0000-4000-8000-000000001063',
  tagAcrylicBlock: '10000000-0000-4000-8000-000000001064',
  tagAcrylicCharm: '10000000-0000-4000-8000-000000001065',
  submissionBackstage: '10000000-0000-4000-8000-000000001111',
  submissionArchive: '10000000-0000-4000-8000-000000001112',
  postNeonClearCard: '10000000-0000-4000-8000-000000001121',
  postNeonBromide: '10000000-0000-4000-8000-000000001122',
  postRioStand: '10000000-0000-4000-8000-000000001123',
  postSoraTapestry: '10000000-0000-4000-8000-000000001124',
  postYunaBoard: '10000000-0000-4000-8000-000000001125',
  postPhotoSet: '10000000-0000-4000-8000-000000001126',
  postImageNeonCard: '10000000-0000-4000-8000-000000001131',
  postImageRioShelf: '10000000-0000-4000-8000-000000001132',
  postImageSoraWall: '10000000-0000-4000-8000-000000001133',
  postImageYunaDesk: '10000000-0000-4000-8000-000000001134',
  exchangeNeonCard: '10000000-0000-4000-8000-000000001141',
  exchangeRioStand: '10000000-0000-4000-8000-000000001142',
  exchangeYunaBlock: '10000000-0000-4000-8000-000000001143',
  exchangeKaitoCharm: '10000000-0000-4000-8000-000000001144',
} as const;

const springBloomReleaseDate = new Date('2026-03-14T00:00:00.000Z');
const midnightEncoreReleaseDate = new Date('2026-05-02T00:00:00.000Z');
const voltageShiftReleaseDate = new Date('2026-04-18T00:00:00.000Z');
const backstagePassReleaseDate = new Date('2026-06-27T00:00:00.000Z');
const winterArchiveReleaseDate = new Date('2026-01-30T00:00:00.000Z');
const starlightReleaseDate = new Date('2026-02-21T00:00:00.000Z');

/**
 * 从 id 末尾派生取图序号。
 *
 * 需要的是「稳定且分散」：同一条记录每次 seed 拿到同一张图，相邻记录不会
 * 拿到同一张。用可变计数器也能分散，但它依赖调用顺序，改动数组顺序就会让
 * 全站的图整体错位。
 */
function sampleIndexFromId(id: string) {
  const digits = id.replace(/\D/g, '').slice(-6);

  return (Number.parseInt(digits, 10) || 1) % 997;
}

function makeGoodsImage(
  id: string,
  goodsId: string,
  assetPath: string,
  altText: string,
  sortOrder = 0,
): GoodImageSeed {
  return {
    id,
    goodsId,
    // 调用方可能已经自己解析过（传进来的是 URL），也可能传的是裸 asset 路径。
    // 已解析的直接用，避免在这里再解析一次把调用方的选择覆盖掉。
    imageUrl: assetPath.startsWith('/')
      ? assetPath
      : resolveSeedImageUrl(sampleIndexFromId(id), assetPath),
    altText,
    sortOrder,
    isPrimary: sortOrder === 0,
  };
}

function makeGoodsTag(goodsId: string, tagId: string): GoodTagSeed {
  return { goodsId, tagId };
}

function makeGoodsCharacter(
  goodsId: string,
  characterId: string,
  sortOrder = 0,
): GoodCharacterSeed {
  return { goodsId, characterId, sortOrder, isPrimary: sortOrder === 0 };
}

function makeUserGoods(
  id: string,
  userId: string,
  goodsId: string,
  status: UserGoodSeed['status'],
  note: string,
  litAt: Date | null = null,
): UserGoodSeed {
  return { id, userId, goodsId, status, note, litAt };
}

function makeRating(
  id: string,
  userId: string,
  goodsId: string,
  score: string,
  artworkScore: number,
  craftsmanshipScore: number,
  valueScore: number,
  rarityScore: number,
  satisfactionScore: number,
  overallTag: RatingSeed['overallTag'],
): RatingSeed {
  return {
    id,
    userId,
    goodsId,
    score,
    artworkScore,
    craftsmanshipScore,
    valueScore,
    rarityScore,
    satisfactionScore,
    worthBuying: true,
    overallTag,
  };
}

export const expandedIpSeed: IpSeed[] = [
  {
    id: ids.ipVelvet,
    slug: 'velvet-circuit',
    name: 'Velvet Circuit',
    nameLocalized: 'Velvet Circuit',
    description:
      'A live-house band franchise built around neon cables, analog synth visuals, and tour goods with strong stage identity.',
    coverImageUrl: resolveSeedImageUrl(40, 'velvet-circuit/brand/ip-cover.svg'),
    status: 'published',
  },
  {
    id: ids.ipAurora,
    slug: 'aurora-archive',
    name: 'Aurora Archive',
    nameLocalized: 'Aurora Archive',
    description:
      'A celestial fantasy line known for archive-style art boards, foil paper goods, and astronomy-themed display pieces.',
    coverImageUrl: resolveSeedImageUrl(41, 'aurora-archive/brand/ip-cover.svg'),
    status: 'published',
  },
];

export const expandedCharacterSeed: CharacterSeed[] = [
  {
    id: ids.characterRio,
    ipId: ids.ipVelvet,
    slug: 'rio-kisaragi',
    name: 'Rio Kisaragi',
    nameLocalized: 'Rio Kisaragi',
    description:
      'Lead guitarist with bright red accents and a goods line that leans into acrylic display pieces.',
    avatarImageUrl: resolveSeedImageUrl(
      42,
      'velvet-circuit/characters/rio-avatar.svg',
    ),
    status: 'published',
  },
  {
    id: ids.characterSora,
    ipId: ids.ipVelvet,
    slug: 'sora-amane',
    name: 'Sora Amane',
    nameLocalized: 'Sora Amane',
    description:
      'Keyboardist with midnight-blue styling, often featured on hologram badges and large-format wall goods.',
    avatarImageUrl: resolveSeedImageUrl(
      43,
      'velvet-circuit/characters/sora-avatar.svg',
    ),
    status: 'published',
  },
  {
    id: ids.characterYuna,
    ipId: ids.ipAurora,
    slug: 'yuna-hoshimi',
    name: 'Yuna Hoshimi',
    nameLocalized: 'Yuna Hoshimi',
    description:
      'Observatory guide character whose line favors foil paper goods, acrylic blocks, and star-map motifs.',
    avatarImageUrl: resolveSeedImageUrl(
      44,
      'aurora-archive/characters/yuna-avatar.svg',
    ),
    status: 'published',
  },
  {
    id: ids.characterKaito,
    ipId: ids.ipAurora,
    slug: 'kaito-asagiri',
    name: 'Kaito Asagiri',
    nameLocalized: 'Kaito Asagiri',
    description:
      'Night archivist with subdued navy tones, frequently paired with Yuna on calm winter event visuals.',
    avatarImageUrl: resolveSeedImageUrl(
      45,
      'aurora-archive/characters/kaito-avatar.svg',
    ),
    status: 'published',
  },
];

export const expandedSeriesSeed: SeriesSeed[] = [
  {
    id: ids.seriesNeonMidnight,
    ipId: baseIds.ipNeon,
    slug: '2026-midnight-encore-live',
    name: '2026 Midnight Encore Live',
    description:
      'A darker encore line with city-light gradients, live photo bromides, and after-show goods.',
    coverImageUrl: resolveSeedImageUrl(
      46,
      'neon-requiem/series/midnight-encore-cover.svg',
    ),
    seriesType: 'live',
    releaseDate: midnightEncoreReleaseDate,
    status: 'published',
  },
  {
    id: ids.seriesVelvetVoltage,
    ipId: ids.ipVelvet,
    slug: '2026-voltage-shift-tour',
    name: '2026 Voltage Shift Tour',
    description:
      'A touring line centered on electric gradients, contrast-heavy key art, and portable collector goods.',
    coverImageUrl: resolveSeedImageUrl(
      47,
      'velvet-circuit/series/voltage-shift-cover.svg',
    ),
    seriesType: 'tour',
    releaseDate: voltageShiftReleaseDate,
    status: 'published',
  },
  {
    id: ids.seriesVelvetBackstage,
    ipId: ids.ipVelvet,
    slug: '2026-backstage-pass-drop',
    name: '2026 Backstage Pass Drop',
    description:
      'A limited backstage capsule with large textiles, holder-style goods, and monochrome venue photos.',
    coverImageUrl: resolveSeedImageUrl(
      48,
      'velvet-circuit/series/backstage-pass-cover.svg',
    ),
    seriesType: 'event',
    releaseDate: backstagePassReleaseDate,
    status: 'published',
  },
  {
    id: ids.seriesAuroraWinter,
    ipId: ids.ipAurora,
    slug: '2026-winter-archive-fair',
    name: '2026 Winter Archive Fair',
    description:
      'A winter release with snow-lit foil art, collector paper goods, and softly framed museum styling.',
    coverImageUrl: resolveSeedImageUrl(
      49,
      'aurora-archive/series/winter-archive-cover.svg',
    ),
    seriesType: 'event',
    releaseDate: winterArchiveReleaseDate,
    status: 'published',
  },
  {
    id: ids.seriesAuroraStarlight,
    ipId: ids.ipAurora,
    slug: '2026-starlight-observatory',
    name: '2026 Starlight Observatory',
    description:
      'A star-map themed line mixing acrylic display blocks, photo sets, and night-sky gradients.',
    coverImageUrl: resolveSeedImageUrl(
      50,
      'aurora-archive/series/starlight-observatory-cover.svg',
    ),
    seriesType: 'event',
    releaseDate: starlightReleaseDate,
    status: 'published',
  },
];

export const expandedGoodsSeed: GoodSeed[] = [
  {
    id: ids.goodsAoiClearCard,
    seriesId: baseIds.seriesSpringBloom,
    skuCode: 'NR-SBF-2026-004',
    slug: 'aoi-tsukishiro-spring-bloom-clear-card',
    name: 'Aoi Tsukishiro Clear Card - Spring Bloom Ver.',
    description:
      'A translucent portrait clear card with layered petals and soft edge printing for binder storage.',
    goodsType: 'clear-card',
    material: 'PET',
    sizeLabel: 'A6',
    edition: 'Venue pickup',
    releaseDate: springBloomReleaseDate,
    msrpAmount: '700.00',
    currencyCode: 'JPY',
    metadata: { finish: 'clear print', useCase: 'binder display' },
    status: 'published',
  },
  {
    id: ids.goodsRenKeychain,
    seriesId: baseIds.seriesSpringBloom,
    skuCode: 'NR-SBF-2026-005',
    slug: 'ren-kagetsu-spring-bloom-ribbon-keychain',
    name: 'Ren Kagetsu Ribbon Keychain - Spring Bloom Ver.',
    description:
      'A die-cut keychain with satin ribbon trim and a compact close-up portrait insert.',
    goodsType: 'keychain',
    material: 'Acrylic / ribbon',
    sizeLabel: '70mm',
    edition: 'Blind bonus exchange desk',
    releaseDate: springBloomReleaseDate,
    msrpAmount: '900.00',
    currencyCode: 'JPY',
    metadata: { finish: 'double-sided', accessory: 'satin ribbon' },
    status: 'published',
  },
  {
    id: ids.goodsDuoBromide,
    seriesId: ids.seriesNeonMidnight,
    skuCode: 'NR-ME-2026-001',
    slug: 'aoi-ren-midnight-encore-bromide-set',
    name: 'Aoi and Ren Bromide Set - Midnight Encore',
    description:
      'A three-sheet bromide set using after-show photography and metallic city-light gradients.',
    goodsType: 'bromide-set',
    material: 'Photo paper',
    sizeLabel: 'L-size x3',
    edition: 'Live venue first',
    releaseDate: midnightEncoreReleaseDate,
    msrpAmount: '1000.00',
    currencyCode: 'JPY',
    metadata: { sheets: 3, finish: 'metallic ink' },
    status: 'published',
  },
  {
    id: ids.goodsRioStand,
    seriesId: ids.seriesVelvetVoltage,
    skuCode: 'VC-VS-2026-001',
    slug: 'rio-kisaragi-voltage-shift-acrylic-stand',
    name: 'Rio Kisaragi Acrylic Stand - Voltage Shift',
    description:
      'A layered acrylic stand with diagonal neon cables and a floor-light base panel.',
    goodsType: 'acrylic-stand',
    material: 'Acrylic',
    sizeLabel: 'H155mm',
    edition: 'Tour goods',
    releaseDate: voltageShiftReleaseDate,
    msrpAmount: '1900.00',
    currencyCode: 'JPY',
    metadata: { backdrop: 'cable wall', finish: 'spot gloss' },
    status: 'published',
  },
  {
    id: ids.goodsSoraBadge,
    seriesId: ids.seriesVelvetVoltage,
    skuCode: 'VC-VS-2026-002',
    slug: 'sora-amane-voltage-shift-hologram-badge',
    name: 'Sora Amane Hologram Badge - Voltage Shift',
    description:
      'A hologram can badge using a deep-blue live visual and prism laminate.',
    goodsType: 'can-badge',
    material: 'Tinplate',
    sizeLabel: '57mm',
    edition: 'Blind pack',
    releaseDate: voltageShiftReleaseDate,
    msrpAmount: '600.00',
    currencyCode: 'JPY',
    metadata: { finish: 'hologram prism', packType: 'blind' },
    status: 'published',
  },
  {
    id: ids.goodsRioSoraCardSet,
    seriesId: ids.seriesVelvetVoltage,
    skuCode: 'VC-VS-2026-003',
    slug: 'rio-sora-voltage-shift-photo-card-set',
    name: 'Rio and Sora Photo Card Set - Voltage Shift',
    description:
      'A duo photo card set with tour costume close-ups and numbered backs.',
    goodsType: 'photo-card-set',
    material: 'Paperboard',
    sizeLabel: '54mm x 86mm x2',
    edition: 'Tour limited',
    releaseDate: voltageShiftReleaseDate,
    msrpAmount: '900.00',
    currencyCode: 'JPY',
    metadata: { cards: 2, finish: 'matte lamination' },
    status: 'published',
  },
  {
    id: ids.goodsSoraTapestry,
    seriesId: ids.seriesVelvetBackstage,
    skuCode: 'VC-BP-2026-001',
    slug: 'sora-amane-backstage-pass-oversized-tapestry',
    name: 'Sora Amane Oversized Tapestry - Backstage Pass',
    description:
      'A large wall tapestry built around monochrome backstage photography and silver typography.',
    goodsType: 'tapestry',
    material: 'Suede fabric',
    sizeLabel: 'B2',
    edition: 'Backstage capsule',
    releaseDate: backstagePassReleaseDate,
    msrpAmount: '4200.00',
    currencyCode: 'JPY',
    metadata: { finish: 'soft suede', display: 'wall mount' },
    status: 'published',
  },
  {
    id: ids.goodsRioPassHolder,
    seriesId: ids.seriesVelvetBackstage,
    skuCode: 'VC-BP-2026-002',
    slug: 'rio-kisaragi-backstage-pass-holder',
    name: 'Rio Kisaragi Pass Holder - Backstage Pass',
    description:
      'A portrait pass holder with lanyard loop and stamped metallic venue credential styling.',
    goodsType: 'pass-holder',
    material: 'PVC / polyester',
    sizeLabel: 'Card size',
    edition: 'Venue limited',
    releaseDate: backstagePassReleaseDate,
    msrpAmount: '1400.00',
    currencyCode: 'JPY',
    metadata: { accessory: 'lanyard loop', finish: 'metallic stamp' },
    status: 'published',
  },
  {
    id: ids.goodsYunaArtBoard,
    seriesId: ids.seriesAuroraWinter,
    skuCode: 'AA-WA-2026-001',
    slug: 'yuna-hoshimi-winter-archive-foil-art-board',
    name: 'Yuna Hoshimi Foil Art Board - Winter Archive',
    description:
      'A rigid art board with snow-glow foil detailing and a quiet archive-room illustration.',
    goodsType: 'art-board',
    material: 'Paperboard',
    sizeLabel: 'A5',
    edition: 'Exhibition shop',
    releaseDate: winterArchiveReleaseDate,
    msrpAmount: '1600.00',
    currencyCode: 'JPY',
    metadata: { finish: 'cold foil', framing: 'gallery border' },
    status: 'published',
  },
  {
    id: ids.goodsKaitoBadge,
    seriesId: ids.seriesAuroraWinter,
    skuCode: 'AA-WA-2026-002',
    slug: 'kaito-asagiri-winter-archive-tin-badge',
    name: 'Kaito Asagiri Tin Badge - Winter Archive',
    description:
      'A calm winter portrait tin badge with pale foil snow patterns and muted archive tones.',
    goodsType: 'can-badge',
    material: 'Tinplate',
    sizeLabel: '56mm',
    edition: 'Blind pack',
    releaseDate: winterArchiveReleaseDate,
    msrpAmount: '550.00',
    currencyCode: 'JPY',
    metadata: { finish: 'snow foil', packType: 'blind' },
    status: 'published',
  },
  {
    id: ids.goodsYunaBlock,
    seriesId: ids.seriesAuroraStarlight,
    skuCode: 'AA-SO-2026-001',
    slug: 'yuna-hoshimi-starlight-observatory-acrylic-block',
    name: 'Yuna Hoshimi Acrylic Block - Starlight Observatory',
    description:
      'A thick acrylic block with embedded star-map art designed for premium shelf display.',
    goodsType: 'acrylic-block',
    material: 'Acrylic',
    sizeLabel: '100mm x 148mm',
    edition: 'Museum shop first',
    releaseDate: starlightReleaseDate,
    msrpAmount: '2800.00',
    currencyCode: 'JPY',
    metadata: { thickness: '20mm', finish: 'full bleed' },
    status: 'published',
  },
  {
    id: ids.goodsYunaKaitoPhotoSet,
    seriesId: ids.seriesAuroraStarlight,
    skuCode: 'AA-SO-2026-002',
    slug: 'yuna-kaito-starlight-observatory-photo-set',
    name: 'Yuna and Kaito Photo Set - Starlight Observatory',
    description:
      'A calm two-photo set using observatory night-shoot visuals and subtle silver captions.',
    goodsType: 'photo-set',
    material: 'Photo paper',
    sizeLabel: '2L x2',
    edition: 'Special exhibition',
    releaseDate: starlightReleaseDate,
    msrpAmount: '1200.00',
    currencyCode: 'JPY',
    metadata: { sheets: 2, finish: 'silk matte' },
    status: 'published',
  },
  {
    id: ids.goodsKaitoCharm,
    seriesId: ids.seriesAuroraStarlight,
    skuCode: 'AA-SO-2026-003',
    slug: 'kaito-asagiri-starlight-observatory-acrylic-charm',
    name: 'Kaito Asagiri Acrylic Charm - Starlight Observatory',
    description:
      'A slim acrylic charm featuring constellation line art and a brushed silver star clasp.',
    goodsType: 'acrylic-charm',
    material: 'Acrylic / metal',
    sizeLabel: '65mm',
    edition: 'Random bonus',
    releaseDate: starlightReleaseDate,
    msrpAmount: '850.00',
    currencyCode: 'JPY',
    metadata: { accessory: 'star clasp', finish: 'clear edge' },
    status: 'published',
  },
];

export const expandedGoodsImageSeed: GoodImageSeed[] = [
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001201',
    ids.goodsAoiClearCard,
    resolveSeedImageUrl(4, 'neon-requiem/goods/aoi-clear-card/front.svg'),
    'Front view of the Aoi Spring Bloom clear card.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001202',
    ids.goodsRenKeychain,
    resolveSeedImageUrl(5, 'neon-requiem/goods/ren-keychain/front.svg'),
    'Front view of the Ren ribbon keychain.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001203',
    ids.goodsDuoBromide,
    'neon-requiem/goods/duo-bromide/front.svg',
    'Main sheet from the Midnight Encore bromide set.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001204',
    ids.goodsDuoBromide,
    'neon-requiem/goods/duo-bromide/detail.svg',
    'Close-up of the bromide metallic city-light print.',
    1,
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001205',
    ids.goodsRioStand,
    resolveSeedImageUrl(6, 'velvet-circuit/goods/rio-stand/front.svg'),
    'Front product photo of the Rio acrylic stand.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001206',
    ids.goodsSoraBadge,
    resolveSeedImageUrl(7, 'velvet-circuit/goods/sora-badge/front.svg'),
    'Front product photo of the Sora hologram badge.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001207',
    ids.goodsRioSoraCardSet,
    'velvet-circuit/goods/rio-sora-card-set/front.svg',
    'Front layout of the Rio and Sora photo card set.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001208',
    ids.goodsSoraTapestry,
    'velvet-circuit/goods/sora-tapestry/front.svg',
    'Hero shot of the Sora oversized tapestry.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001209',
    ids.goodsRioPassHolder,
    'velvet-circuit/goods/rio-pass-holder/front.svg',
    'Front shot of the Rio pass holder with strap.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001210',
    ids.goodsYunaArtBoard,
    resolveSeedImageUrl(8, 'aurora-archive/goods/yuna-art-board/front.svg'),
    'Front view of the Yuna foil art board.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001211',
    ids.goodsKaitoBadge,
    'aurora-archive/goods/kaito-badge/front.svg',
    'Front view of the Kaito winter badge.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001212',
    ids.goodsYunaBlock,
    'aurora-archive/goods/yuna-block/front.svg',
    'Front view of the Yuna acrylic block.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001213',
    ids.goodsYunaBlock,
    'aurora-archive/goods/yuna-block/desk.svg',
    'Desk display of the Yuna acrylic block under warm light.',
    1,
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001214',
    ids.goodsYunaKaitoPhotoSet,
    'aurora-archive/goods/yuna-kaito-photo-set/front.svg',
    'Front layout of the Yuna and Kaito photo set.',
  ),
  makeGoodsImage(
    '10000000-0000-4000-8000-000000001215',
    ids.goodsKaitoCharm,
    resolveSeedImageUrl(9, 'aurora-archive/goods/kaito-charm/front.svg'),
    'Front view of the Kaito acrylic charm.',
  ),
];

export const expandedTagSeed: TagSeed[] = [
  { id: ids.tagClearCard, slug: 'clear-card', name: 'Clear Card' },
  { id: ids.tagKeychain, slug: 'keychain', name: 'Keychain' },
  {
    id: ids.tagMidnightEncore,
    slug: 'midnight-encore',
    name: 'Midnight Encore',
  },
  { id: ids.tagBromideSet, slug: 'bromide-set', name: 'Bromide Set' },
  { id: ids.tagVoltageShift, slug: 'voltage-shift', name: 'Voltage Shift' },
  { id: ids.tagTourLimited, slug: 'tour-limited', name: 'Tour Limited' },
  { id: ids.tagPhotoCard, slug: 'photo-card', name: 'Photo Card' },
  {
    id: ids.tagBackstagePass,
    slug: 'backstage-pass',
    name: 'Backstage Pass',
  },
  { id: ids.tagTapestry, slug: 'tapestry', name: 'Tapestry' },
  {
    id: ids.tagWinterArchive,
    slug: 'winter-archive',
    name: 'Winter Archive',
  },
  { id: ids.tagHoloFoil, slug: 'holo-foil', name: 'Holo Foil' },
  { id: ids.tagNightSky, slug: 'night-sky', name: 'Night Sky' },
  {
    id: ids.tagStarlight,
    slug: 'starlight-observatory',
    name: 'Starlight Observatory',
  },
  { id: ids.tagAcrylicBlock, slug: 'acrylic-block', name: 'Acrylic Block' },
  {
    id: ids.tagAcrylicCharm,
    slug: 'acrylic-charm',
    name: 'Acrylic Charm',
  },
];

export const expandedGoodsTagSeed: GoodTagSeed[] = [
  makeGoodsTag(ids.goodsAoiClearCard, ids.tagClearCard),
  makeGoodsTag(ids.goodsAoiClearCard, baseIds.tagSpringBloom),
  makeGoodsTag(ids.goodsRenKeychain, ids.tagKeychain),
  makeGoodsTag(ids.goodsRenKeychain, baseIds.tagEventLimited),
  makeGoodsTag(ids.goodsDuoBromide, ids.tagMidnightEncore),
  makeGoodsTag(ids.goodsDuoBromide, ids.tagBromideSet),
  makeGoodsTag(ids.goodsDuoBromide, baseIds.tagDuoArt),
  makeGoodsTag(ids.goodsRioStand, ids.tagVoltageShift),
  makeGoodsTag(ids.goodsRioStand, baseIds.tagEventLimited),
  makeGoodsTag(ids.goodsSoraBadge, ids.tagVoltageShift),
  makeGoodsTag(ids.goodsSoraBadge, ids.tagHoloFoil),
  makeGoodsTag(ids.goodsSoraBadge, baseIds.tagGlitterFinish),
  makeGoodsTag(ids.goodsRioSoraCardSet, ids.tagPhotoCard),
  makeGoodsTag(ids.goodsRioSoraCardSet, ids.tagTourLimited),
  makeGoodsTag(ids.goodsRioSoraCardSet, baseIds.tagDuoArt),
  makeGoodsTag(ids.goodsSoraTapestry, ids.tagBackstagePass),
  makeGoodsTag(ids.goodsSoraTapestry, ids.tagTapestry),
  makeGoodsTag(ids.goodsRioPassHolder, ids.tagBackstagePass),
  makeGoodsTag(ids.goodsYunaArtBoard, ids.tagWinterArchive),
  makeGoodsTag(ids.goodsYunaArtBoard, ids.tagHoloFoil),
  makeGoodsTag(ids.goodsKaitoBadge, ids.tagWinterArchive),
  makeGoodsTag(ids.goodsKaitoBadge, ids.tagNightSky),
  makeGoodsTag(ids.goodsYunaBlock, ids.tagStarlight),
  makeGoodsTag(ids.goodsYunaBlock, ids.tagAcrylicBlock),
  makeGoodsTag(ids.goodsYunaKaitoPhotoSet, ids.tagStarlight),
  makeGoodsTag(ids.goodsYunaKaitoPhotoSet, baseIds.tagDuoArt),
  makeGoodsTag(ids.goodsKaitoCharm, ids.tagStarlight),
  makeGoodsTag(ids.goodsKaitoCharm, ids.tagAcrylicCharm),
];

export const expandedGoodsCharacterSeed: GoodCharacterSeed[] = [
  makeGoodsCharacter(ids.goodsAoiClearCard, baseIds.characterAoi),
  makeGoodsCharacter(ids.goodsRenKeychain, baseIds.characterRen),
  makeGoodsCharacter(ids.goodsDuoBromide, baseIds.characterAoi),
  makeGoodsCharacter(ids.goodsDuoBromide, baseIds.characterRen, 1),
  makeGoodsCharacter(ids.goodsRioStand, ids.characterRio),
  makeGoodsCharacter(ids.goodsSoraBadge, ids.characterSora),
  makeGoodsCharacter(ids.goodsRioSoraCardSet, ids.characterRio),
  makeGoodsCharacter(ids.goodsRioSoraCardSet, ids.characterSora, 1),
  makeGoodsCharacter(ids.goodsSoraTapestry, ids.characterSora),
  makeGoodsCharacter(ids.goodsRioPassHolder, ids.characterRio),
  makeGoodsCharacter(ids.goodsYunaArtBoard, ids.characterYuna),
  makeGoodsCharacter(ids.goodsKaitoBadge, ids.characterKaito),
  makeGoodsCharacter(ids.goodsYunaBlock, ids.characterYuna),
  makeGoodsCharacter(ids.goodsYunaKaitoPhotoSet, ids.characterYuna),
  makeGoodsCharacter(ids.goodsYunaKaitoPhotoSet, ids.characterKaito, 1),
  makeGoodsCharacter(ids.goodsKaitoCharm, ids.characterKaito),
];

export const expandedUserGoodsSeed: UserGoodSeed[] = [
  makeUserGoods(
    '10000000-0000-4000-8000-000000001301',
    demoUserIds.collector,
    ids.goodsAoiClearCard,
    'owned',
    'Filed into the Aoi binder page.',
    new Date('2026-08-04T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001302',
    demoUserIds.collector,
    ids.goodsDuoBromide,
    'wanted',
    'Still missing the venue-first print set.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001303',
    demoUserIds.collector,
    ids.goodsRioStand,
    'wanted',
    'Considering it for the synth shelf corner.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001304',
    demoUserIds.collector,
    ids.goodsYunaBlock,
    'owned',
    'Display piece for the observatory shelf.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001305',
    demoUserIds.collector,
    ids.goodsYunaKaitoPhotoSet,
    'owned',
    'Stored with large bromides.',
    new Date('2026-08-05T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001316',
    demoUserIds.trader,
    ids.goodsRenKeychain,
    'owned',
    '扫描实物后点亮的可换库存。',
    new Date('2026-08-06T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001306',
    demoUserIds.trader,
    ids.goodsRenKeychain,
    'exchange',
    'Duplicate from the venue desk.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001317',
    demoUserIds.trader,
    ids.goodsSoraBadge,
    'owned',
    '扫描实物后点亮的可换库存。',
    new Date('2026-08-07T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001307',
    demoUserIds.trader,
    ids.goodsSoraBadge,
    'exchange',
    'Extra blind-pack pull kept sealed.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001308',
    demoUserIds.trader,
    ids.goodsRioPassHolder,
    'owned',
    'Carried once during the tour.',
    new Date('2026-08-08T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001318',
    demoUserIds.trader,
    ids.goodsKaitoCharm,
    'owned',
    '扫描实物后点亮的可换库存。',
    new Date('2026-08-09T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001309',
    demoUserIds.trader,
    ids.goodsKaitoCharm,
    'exchange',
    'Looking to swap for Yuna items.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001310',
    demoUserIds.reviewer,
    ids.goodsRioStand,
    'owned',
    'Clean acrylic edges and good color density.',
    new Date('2026-08-10T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001311',
    demoUserIds.reviewer,
    ids.goodsSoraTapestry,
    'owned',
    'Mounted in a poster frame.',
    new Date('2026-08-11T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001312',
    demoUserIds.reviewer,
    ids.goodsYunaArtBoard,
    'owned',
    'One of the best winter paper goods this year.',
    new Date('2026-08-12T09:00:00.000Z'),
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001313',
    demoUserIds.reviewer,
    ids.goodsKaitoBadge,
    'wanted',
    'Still trying to pull this from blind packs.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001314',
    demoUserIds.reviewer,
    ids.goodsYunaBlock,
    'wanted',
    'Would buy if the block edges are clean.',
  ),
  makeUserGoods(
    '10000000-0000-4000-8000-000000001315',
    demoUserIds.reviewer,
    ids.goodsAoiClearCard,
    'owned',
    'Good translucency without muddy skin tones.',
    new Date('2026-08-13T09:00:00.000Z'),
  ),
];

export const expandedRatingSeed: RatingSeed[] = [
  makeRating(
    '10000000-0000-4000-8000-000000001401',
    demoUserIds.collector,
    ids.goodsAoiClearCard,
    '4.20',
    4,
    4,
    5,
    3,
    5,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001402',
    demoUserIds.collector,
    ids.goodsYunaBlock,
    '4.80',
    5,
    5,
    4,
    4,
    5,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001403',
    demoUserIds.trader,
    ids.goodsRenKeychain,
    '3.80',
    4,
    4,
    3,
    3,
    4,
    'neutral',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001404',
    demoUserIds.trader,
    ids.goodsSoraBadge,
    '4.30',
    4,
    5,
    4,
    4,
    4,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001405',
    demoUserIds.reviewer,
    ids.goodsRioStand,
    '4.70',
    5,
    5,
    4,
    4,
    5,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001406',
    demoUserIds.reviewer,
    ids.goodsSoraTapestry,
    '4.10',
    4,
    4,
    3,
    4,
    5,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001407',
    demoUserIds.reviewer,
    ids.goodsYunaArtBoard,
    '4.60',
    5,
    4,
    4,
    4,
    5,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001408',
    demoUserIds.collector,
    ids.goodsYunaKaitoPhotoSet,
    '4.10',
    4,
    4,
    4,
    3,
    5,
    'positive',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001409',
    demoUserIds.trader,
    ids.goodsKaitoCharm,
    '4.00',
    4,
    4,
    4,
    3,
    4,
    'neutral',
  ),
  makeRating(
    '10000000-0000-4000-8000-000000001410',
    demoUserIds.collector,
    ids.goodsDuoBromide,
    '4.50',
    5,
    4,
    4,
    4,
    5,
    'positive',
  ),
];

export const expandedCatalogSubmissionSeed: CatalogSubmissionSeed[] = [
  {
    id: ids.submissionBackstage,
    userId: demoUserIds.trader,
    submissionType: 'update',
    targetEntityType: 'goods',
    targetEntityId: ids.goodsRioPassHolder,
    title: 'Backstage pass holder should note included strap card',
    body: 'Venue pickup included a printed strap card insert. Current encyclopedia entry only mentions the holder shell.',
    payload: {
      targetField: 'metadata.accessory',
      proposedValue: 'lanyard loop and printed strap card',
    },
    moderationStatus: 'pending',
  },
  {
    id: ids.submissionArchive,
    userId: demoUserIds.collector,
    submissionType: 'create',
    targetEntityType: 'series',
    targetEntityId: null,
    title: 'Add observatory mini clear file side release',
    body: 'The Starlight Observatory popup also sold a two-pocket clear file pair not yet represented in the catalog.',
    payload: {
      proposedSeriesSlug: '2026-starlight-observatory',
      proposedGoodsType: 'clear-file',
    },
    moderationStatus: 'pending',
  },
];

export const expandedPostSeed: PostSeed[] = [
  {
    id: ids.postNeonClearCard,
    goodsId: ids.goodsAoiClearCard,
    userId: demoUserIds.collector,
    body: 'The clear stock is better than expected and the petal framing works well in a 9-pocket binder.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postNeonBromide,
    goodsId: ids.goodsDuoBromide,
    userId: demoUserIds.reviewer,
    body: 'This feels like the real completion reward for Midnight Encore. The metallic city-light print is subtle but premium.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postRioStand,
    goodsId: ids.goodsRioStand,
    userId: demoUserIds.reviewer,
    body: 'Strong silhouette and the red cable motif reads well from a distance on shelf.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postSoraTapestry,
    goodsId: ids.goodsSoraTapestry,
    userId: demoUserIds.trader,
    body: 'Material is softer than a standard wall scroll and the monochrome print avoids looking muddy.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postYunaBoard,
    goodsId: ids.goodsYunaArtBoard,
    userId: demoUserIds.reviewer,
    body: 'Foil snow details are restrained. It feels closer to a gallery postcard than a typical event bonus.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postPhotoSet,
    goodsId: ids.goodsYunaKaitoPhotoSet,
    userId: demoUserIds.collector,
    body: 'Quiet composition, good paper stock, and the silver captions do not overpower the sky gradient.',
    status: 'visible',
    moderationStatus: 'approved',
  },
];

export const expandedPostImageSeed: PostImageSeed[] = [
  {
    id: ids.postImageNeonCard,
    postId: ids.postNeonClearCard,
    imageUrl: resolveSeedImageUrl(
      4,
      'neon-requiem/community/aoi-clear-card-binder.svg',
    ),
    storagePath: resolveSeedStoragePath(
      4,
      'legacy/demo/neon-requiem/community/aoi-clear-card-binder.webp',
    ),
    altText: 'User photo of the Aoi clear card inside a binder page.',
    sortOrder: 0,
    moderationStatus: 'approved',
  },
  {
    id: ids.postImageRioShelf,
    postId: ids.postRioStand,
    imageUrl: resolveSeedImageUrl(
      6,
      'velvet-circuit/community/rio-stand-shelf.svg',
    ),
    storagePath: resolveSeedStoragePath(
      6,
      'legacy/demo/velvet-circuit/community/rio-stand-shelf.webp',
    ),
    altText: 'User shelf photo of the Rio acrylic stand.',
    sortOrder: 0,
    moderationStatus: 'approved',
  },
  {
    id: ids.postImageSoraWall,
    postId: ids.postSoraTapestry,
    imageUrl: resolveSeedImageUrl(
      7,
      'velvet-circuit/community/sora-tapestry-wall.svg',
    ),
    storagePath: resolveSeedStoragePath(
      7,
      'legacy/demo/velvet-circuit/community/sora-tapestry-wall.webp',
    ),
    altText: 'User wall photo of the Sora tapestry in a room setup.',
    sortOrder: 0,
    moderationStatus: 'approved',
  },
  {
    id: ids.postImageYunaDesk,
    postId: ids.postYunaBoard,
    imageUrl: resolveSeedImageUrl(
      8,
      'aurora-archive/community/yuna-art-board-desk.svg',
    ),
    storagePath: resolveSeedStoragePath(
      8,
      'legacy/demo/aurora-archive/community/yuna-art-board-desk.webp',
    ),
    altText: 'User desk photo of the Yuna art board beside archive books.',
    sortOrder: 0,
    moderationStatus: 'approved',
  },
];

/**
 * 补齐实物记录的图片覆盖。
 *
 * 此前 16 个 SKU 里只有 6 个有社区图片，其余十个的详情页「实物记录」一段
 * 长期显示「暂无图片」—— 演示数据里的空白比真实的空白更没有意义，它只是
 * 没被写进种子而已。
 *
 * 用确定的 UUID，与其他种子一样可重复执行。
 */
const communityBackfill: Array<{
  suffix: string;
  goodsId: string;
  userId: string;
  body: string;
}> = [
  {
    suffix: '01',
    goodsId: baseIds.goodsDuoShikishi,
    userId: demoUserIds.collector,
    body: '烫金在灯下会随角度变色，扫描件完全拍不出这个效果。',
  },
  {
    suffix: '02',
    goodsId: ids.goodsDuoBromide,
    userId: demoUserIds.trader,
    body: '一套四张的边缘裁切很整齐，收进册子里不会卡。',
  },
  {
    suffix: '03',
    goodsId: ids.goodsRenKeychain,
    userId: demoUserIds.reviewer,
    body: '挂在包上两个月，漆面没有明显磨损。',
  },
  {
    suffix: '04',
    goodsId: ids.goodsSoraBadge,
    userId: demoUserIds.collector,
    body: '镭射层在室内光下偏冷，户外才看得出完整的渐变。',
  },
  {
    suffix: '05',
    goodsId: ids.goodsRioSoraCardSet,
    userId: demoUserIds.trader,
    body: '卡面比想象中厚，双人图的构图在实物上更舒展。',
  },
  {
    suffix: '06',
    goodsId: ids.goodsRioPassHolder,
    userId: demoUserIds.reviewer,
    body: '挂绳的长度适合站着用，坐下会有点短。',
  },
  {
    suffix: '07',
    goodsId: ids.goodsKaitoBadge,
    userId: demoUserIds.collector,
    body: '马口铁的边缘做了收口，别针位置正。',
  },
  {
    suffix: '08',
    goodsId: ids.goodsYunaBlock,
    userId: demoUserIds.trader,
    body: '亚克力块比图上厚一圈，放在桌面很稳。',
  },
  {
    suffix: '09',
    goodsId: ids.goodsYunaKaitoPhotoSet,
    userId: demoUserIds.reviewer,
    body: '相纸是哑面的，指纹不明显。',
  },
  {
    suffix: '10',
    goodsId: ids.goodsKaitoCharm,
    userId: demoUserIds.collector,
    body: '双面印刷，背面的星图细节没有偷工。',
  },
];

export const backfilledPostSeed: PostSeed[] = communityBackfill.map(
  (entry) => ({
    id: `10000000-0000-4000-8000-0000000031${entry.suffix}`,
    goodsId: entry.goodsId,
    userId: entry.userId,
    body: entry.body,
    status: 'visible',
    moderationStatus: 'approved',
  }),
);

export const backfilledPostImageSeed: PostImageSeed[] = communityBackfill.map(
  (entry, index) => ({
    id: `10000000-0000-4000-8000-0000000032${entry.suffix}`,
    postId: `10000000-0000-4000-8000-0000000031${entry.suffix}`,
    imageUrl: resolveSeedImageUrl(
      index + 12,
      'neon-requiem/community/backfill.svg',
    ),
    storagePath: resolveSeedStoragePath(
      index + 12,
      `legacy/demo/community/backfill-${entry.suffix}.webp`,
    ),
    altText: '用户上传的实物照片。',
    sortOrder: 0,
    moderationStatus: 'approved',
  }),
);
