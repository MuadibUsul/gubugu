import type { InferInsertModel } from 'drizzle-orm';

import { buildDemoAssetUrl } from '../../lib/demo-assets';
import { getLocalSampleImageAsset } from './local-sample-images';

import {
  catalogSubmissions,
  characters,
  exchangeListings,
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
type ExchangeListingSeed = InferInsertModel<typeof exchangeListings>;

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

const ids = {
  ip: '10000000-0000-4000-8000-000000000001',
  characterAoi: '10000000-0000-4000-8000-000000000011',
  characterRen: '10000000-0000-4000-8000-000000000012',
  seriesSpringBloom: '10000000-0000-4000-8000-000000000021',
  goodsAoiStand: '10000000-0000-4000-8000-000000000031',
  goodsRenBadge: '10000000-0000-4000-8000-000000000032',
  goodsDuoShikishi: '10000000-0000-4000-8000-000000000033',
  goodsImageAoiFront: '10000000-0000-4000-8000-000000000041',
  goodsImageAoiDesk: '10000000-0000-4000-8000-000000000042',
  goodsImageRenFront: '10000000-0000-4000-8000-000000000043',
  goodsImageRenDetail: '10000000-0000-4000-8000-000000000044',
  goodsImageDuoFront: '10000000-0000-4000-8000-000000000045',
  goodsImageDuoFoil: '10000000-0000-4000-8000-000000000046',
  goodsImageDuoBack: '10000000-0000-4000-8000-000000000047',
  tagSpringBloom: '10000000-0000-4000-8000-000000000051',
  tagEventLimited: '10000000-0000-4000-8000-000000000052',
  tagAcrylicStand: '10000000-0000-4000-8000-000000000053',
  tagCanBadge: '10000000-0000-4000-8000-000000000054',
  tagMiniShikishi: '10000000-0000-4000-8000-000000000055',
  tagGlitterFinish: '10000000-0000-4000-8000-000000000056',
  tagBlindPack: '10000000-0000-4000-8000-000000000057',
  tagDuoArt: '10000000-0000-4000-8000-000000000058',
  postAoiReview: '10000000-0000-4000-8000-000000000061',
  postRenTradeNote: '10000000-0000-4000-8000-000000000062',
  postDuoReview: '10000000-0000-4000-8000-000000000063',
  postImageAoiDesk: '10000000-0000-4000-8000-000000000071',
  postImageAoiCloseup: '10000000-0000-4000-8000-000000000072',
  postImageRenBadge: '10000000-0000-4000-8000-000000000073',
  exchangeRenOpen: '10000000-0000-4000-8000-000000000081',
  exchangeAoiPaused: '10000000-0000-4000-8000-000000000082',
  submissionNewCharm: '10000000-0000-4000-8000-000000000111',
  submissionDuoFix: '10000000-0000-4000-8000-000000000112',
} as const;

export const demoUserIds = {
  collector: '20000000-0000-4000-8000-000000000001',
  trader: '20000000-0000-4000-8000-000000000002',
  reviewer: '20000000-0000-4000-8000-000000000003',
} as const;

const springBloomReleaseDate = new Date('2026-03-14T00:00:00.000Z');

export const ipSeed: IpSeed[] = [
  {
    id: ids.ip,
    slug: 'neon-requiem',
    name: 'Neon Requiem',
    nameLocalized: 'Neon Requiem',
    description:
      'A stage-driven sci-fi idol franchise known for luminous costumes, event visuals, and collector-focused merchandise drops.',
    coverImageUrl: buildDemoAssetUrl('neon-requiem/brand/ip-cover.svg'),
    status: 'published',
  },
];

export const characterSeed: CharacterSeed[] = [
  {
    id: ids.characterAoi,
    ipId: ids.ip,
    slug: 'aoi-tsukishiro',
    name: 'Aoi Tsukishiro',
    nameLocalized: 'Aoi Tsukishiro',
    description:
      'Cool-toned lead vocalist whose spring event goods lean toward acrylic display pieces and layered art.',
    avatarImageUrl: buildDemoAssetUrl('neon-requiem/characters/aoi-avatar.svg'),
    status: 'published',
  },
  {
    id: ids.characterRen,
    ipId: ids.ip,
    slug: 'ren-kagetsu',
    name: 'Ren Kagetsu',
    nameLocalized: 'Ren Kagetsu',
    description:
      'Fast-rising guitarist frequently featured on blind-pack badges, foil prints, and event-exclusive pair art.',
    avatarImageUrl: buildDemoAssetUrl('neon-requiem/characters/ren-avatar.svg'),
    status: 'published',
  },
];

export const seriesSeed: SeriesSeed[] = [
  {
    id: ids.seriesSpringBloom,
    ipId: ids.ip,
    slug: '2026-spring-bloom-fair',
    name: '2026 Spring Bloom Fair',
    description:
      'A sakura-themed event line with soft pink lighting, glitter accents, and venue-first merchandise variants.',
    coverImageUrl: buildDemoAssetUrl(
      'neon-requiem/series/spring-bloom-cover.svg',
    ),
    seriesType: 'event',
    releaseDate: springBloomReleaseDate,
    status: 'published',
  },
];

export const goodsSeed: GoodSeed[] = [
  {
    id: ids.goodsAoiStand,
    seriesId: ids.seriesSpringBloom,
    skuCode: 'NR-SBF-2026-001',
    slug: 'aoi-tsukishiro-spring-bloom-acrylic-stand',
    name: 'Aoi Tsukishiro Acrylic Stand - Spring Bloom Ver.',
    description:
      'A tall acrylic display piece with layered sakura petals and a translucent concert-stage base.',
    goodsType: 'acrylic-stand',
    material: 'Acrylic',
    sizeLabel: 'H150mm',
    edition: 'Venue and web lottery',
    releaseDate: springBloomReleaseDate,
    msrpAmount: '1800.00',
    currencyCode: 'JPY',
    metadata: {
      finish: 'clear print',
      backdrop: 'sakura stage',
      displayStyle: 'desk',
    },
    status: 'published',
  },
  {
    id: ids.goodsRenBadge,
    seriesId: ids.seriesSpringBloom,
    skuCode: 'NR-SBF-2026-002',
    slug: 'ren-kagetsu-spring-bloom-glitter-can-badge',
    name: 'Ren Kagetsu Glitter Can Badge - Spring Bloom Ver.',
    description:
      'A blind-pack 56mm can badge using a warm glitter laminate and close-up event artwork.',
    goodsType: 'can-badge',
    material: 'Tinplate',
    sizeLabel: '56mm',
    edition: 'Blind pack',
    releaseDate: springBloomReleaseDate,
    msrpAmount: '600.00',
    currencyCode: 'JPY',
    metadata: {
      finish: 'glitter laminate',
      packType: 'blind',
      artworkCrop: 'close-up',
    },
    status: 'published',
  },
  {
    id: ids.goodsDuoShikishi,
    seriesId: ids.seriesSpringBloom,
    skuCode: 'NR-SBF-2026-003',
    slug: 'aoi-ren-spring-bloom-foil-mini-shikishi',
    name: 'Aoi and Ren Foil Mini Shikishi - Spring Bloom Ver.',
    description:
      'A duo mini shikishi with foil signatures, soft bloom effects, and premium pair art for completion collectors.',
    goodsType: 'mini-shikishi',
    material: 'Paperboard',
    sizeLabel: '135mm x 120mm',
    edition: 'Venue exclusive',
    releaseDate: springBloomReleaseDate,
    msrpAmount: '1200.00',
    currencyCode: 'JPY',
    metadata: {
      finish: 'foil signature',
      artworkMode: 'duo visual',
      storageHint: 'binder friendly',
    },
    status: 'published',
  },
];

export const goodsImageSeed: GoodImageSeed[] = [
  {
    id: ids.goodsImageAoiFront,
    goodsId: ids.goodsAoiStand,
    imageUrl: resolveSeedImageUrl(1, 'neon-requiem/goods/aoi-stand/front.svg'),
    altText: 'Front product photo of the Aoi Spring Bloom acrylic stand.',
    sortOrder: 0,
    isPrimary: true,
  },
  {
    id: ids.goodsImageAoiDesk,
    goodsId: ids.goodsAoiStand,
    imageUrl: buildDemoAssetUrl('neon-requiem/goods/aoi-stand/desk.svg'),
    altText: 'Desk display photo of the Aoi acrylic stand under warm lighting.',
    sortOrder: 1,
    isPrimary: false,
  },
  {
    id: ids.goodsImageRenFront,
    goodsId: ids.goodsRenBadge,
    imageUrl: resolveSeedImageUrl(2, 'neon-requiem/goods/ren-badge/front.svg'),
    altText: 'Front product photo of the Ren Spring Bloom glitter can badge.',
    sortOrder: 0,
    isPrimary: true,
  },
  {
    id: ids.goodsImageRenDetail,
    goodsId: ids.goodsRenBadge,
    imageUrl: buildDemoAssetUrl('neon-requiem/goods/ren-badge/detail.svg'),
    altText: 'Close-up detail showing the glitter finish on the Ren badge.',
    sortOrder: 1,
    isPrimary: false,
  },
  {
    id: ids.goodsImageDuoFront,
    goodsId: ids.goodsDuoShikishi,
    imageUrl: resolveSeedImageUrl(3, 'neon-requiem/goods/duo-shikishi/front.svg'),
    altText: 'Front product shot of the Aoi and Ren duo mini shikishi.',
    sortOrder: 0,
    isPrimary: true,
  },
  {
    id: ids.goodsImageDuoFoil,
    goodsId: ids.goodsDuoShikishi,
    imageUrl: buildDemoAssetUrl('neon-requiem/goods/duo-shikishi/foil.svg'),
    altText: 'Foil detail shot of the duo mini shikishi signatures.',
    sortOrder: 1,
    isPrimary: false,
  },
  {
    id: ids.goodsImageDuoBack,
    goodsId: ids.goodsDuoShikishi,
    imageUrl: buildDemoAssetUrl('neon-requiem/goods/duo-shikishi/back.svg'),
    altText: 'Back product shot of the duo mini shikishi packaging.',
    sortOrder: 2,
    isPrimary: false,
  },
];

export const tagSeed: TagSeed[] = [
  { id: ids.tagSpringBloom, slug: 'spring-bloom', name: 'Spring Bloom' },
  { id: ids.tagEventLimited, slug: 'event-limited', name: 'Event Limited' },
  { id: ids.tagAcrylicStand, slug: 'acrylic-stand', name: 'Acrylic Stand' },
  { id: ids.tagCanBadge, slug: 'can-badge', name: 'Can Badge' },
  { id: ids.tagMiniShikishi, slug: 'mini-shikishi', name: 'Mini Shikishi' },
  { id: ids.tagGlitterFinish, slug: 'glitter-finish', name: 'Glitter Finish' },
  { id: ids.tagBlindPack, slug: 'blind-pack', name: 'Blind Pack' },
  { id: ids.tagDuoArt, slug: 'duo-art', name: 'Duo Art' },
];

export const goodsTagSeed: GoodTagSeed[] = [
  { goodsId: ids.goodsAoiStand, tagId: ids.tagSpringBloom },
  { goodsId: ids.goodsAoiStand, tagId: ids.tagEventLimited },
  { goodsId: ids.goodsAoiStand, tagId: ids.tagAcrylicStand },
  { goodsId: ids.goodsRenBadge, tagId: ids.tagSpringBloom },
  { goodsId: ids.goodsRenBadge, tagId: ids.tagCanBadge },
  { goodsId: ids.goodsRenBadge, tagId: ids.tagBlindPack },
  { goodsId: ids.goodsRenBadge, tagId: ids.tagGlitterFinish },
  { goodsId: ids.goodsDuoShikishi, tagId: ids.tagSpringBloom },
  { goodsId: ids.goodsDuoShikishi, tagId: ids.tagEventLimited },
  { goodsId: ids.goodsDuoShikishi, tagId: ids.tagMiniShikishi },
  { goodsId: ids.goodsDuoShikishi, tagId: ids.tagGlitterFinish },
  { goodsId: ids.goodsDuoShikishi, tagId: ids.tagDuoArt },
];

export const goodsCharacterSeed: GoodCharacterSeed[] = [
  {
    goodsId: ids.goodsAoiStand,
    characterId: ids.characterAoi,
    sortOrder: 0,
    isPrimary: true,
  },
  {
    goodsId: ids.goodsRenBadge,
    characterId: ids.characterRen,
    sortOrder: 0,
    isPrimary: true,
  },
  {
    goodsId: ids.goodsDuoShikishi,
    characterId: ids.characterAoi,
    sortOrder: 0,
    isPrimary: true,
  },
  {
    goodsId: ids.goodsDuoShikishi,
    characterId: ids.characterRen,
    sortOrder: 1,
    isPrimary: false,
  },
];

export const userGoodsSeed: UserGoodSeed[] = [
  {
    id: '10000000-0000-4000-8000-000000000091',
    userId: demoUserIds.collector,
    goodsId: ids.goodsAoiStand,
    status: 'owned',
    note: 'Main desk display copy.',
  },
  {
    id: '10000000-0000-4000-8000-000000000092',
    userId: demoUserIds.collector,
    goodsId: ids.goodsRenBadge,
    status: 'wanted',
    note: 'Looking for a clean glitter copy.',
  },
  {
    id: '10000000-0000-4000-8000-000000000093',
    userId: demoUserIds.collector,
    goodsId: ids.goodsDuoShikishi,
    status: 'wanted',
    note: 'Saving for the foil duo art piece.',
  },
  {
    id: '10000000-0000-4000-8000-000000000097',
    userId: demoUserIds.collector,
    goodsId: ids.goodsAoiStand,
    status: 'exchange',
    note: 'Reserved as a local meetup swap candidate.',
  },
  {
    id: '10000000-0000-4000-8000-000000000094',
    userId: demoUserIds.trader,
    goodsId: ids.goodsRenBadge,
    status: 'owned',
    note: 'Pulled a duplicate from blind packs.',
  },
  {
    id: '10000000-0000-4000-8000-000000000095',
    userId: demoUserIds.trader,
    goodsId: ids.goodsRenBadge,
    status: 'exchange',
    note: 'Open to event-limited swaps.',
  },
  {
    id: '10000000-0000-4000-8000-000000000096',
    userId: demoUserIds.reviewer,
    goodsId: ids.goodsDuoShikishi,
    status: 'owned',
    note: 'Stored in a mini shikishi binder.',
  },
];

export const ratingSeed: RatingSeed[] = [
  {
    id: '10000000-0000-4000-8000-000000000101',
    userId: demoUserIds.collector,
    goodsId: ids.goodsAoiStand,
    score: '4.40',
    artworkScore: 5,
    craftsmanshipScore: 4,
    valueScore: 4,
    rarityScore: 4,
    satisfactionScore: 5,
    worthBuying: true,
    overallTag: 'positive',
  },
  {
    id: '10000000-0000-4000-8000-000000000102',
    userId: demoUserIds.collector,
    goodsId: ids.goodsRenBadge,
    score: '4.00',
    artworkScore: 4,
    craftsmanshipScore: 4,
    valueScore: 5,
    rarityScore: 3,
    satisfactionScore: 4,
    worthBuying: true,
    overallTag: 'positive',
  },
  {
    id: '10000000-0000-4000-8000-000000000103',
    userId: demoUserIds.trader,
    goodsId: ids.goodsRenBadge,
    score: '4.40',
    artworkScore: 4,
    craftsmanshipScore: 5,
    valueScore: 4,
    rarityScore: 4,
    satisfactionScore: 5,
    worthBuying: true,
    overallTag: 'positive',
  },
  {
    id: '10000000-0000-4000-8000-000000000104',
    userId: demoUserIds.reviewer,
    goodsId: ids.goodsAoiStand,
    score: '4.00',
    artworkScore: 5,
    craftsmanshipScore: 4,
    valueScore: 3,
    rarityScore: 4,
    satisfactionScore: 4,
    worthBuying: true,
    overallTag: 'neutral',
  },
  {
    id: '10000000-0000-4000-8000-000000000105',
    userId: demoUserIds.reviewer,
    goodsId: ids.goodsDuoShikishi,
    score: '4.80',
    artworkScore: 5,
    craftsmanshipScore: 5,
    valueScore: 4,
    rarityScore: 5,
    satisfactionScore: 5,
    worthBuying: true,
    overallTag: 'positive',
  },
];

export const catalogSubmissionSeed: CatalogSubmissionSeed[] = [
  {
    id: ids.submissionNewCharm,
    userId: demoUserIds.collector,
    submissionType: 'create',
    targetEntityType: 'goods',
    targetEntityId: null,
    title: 'Add Spring Bloom acrylic charm variant',
    body: 'Venue lottery had a mini acrylic charm variant not in the current catalog. User attached release note details for a future structured SKU entry.',
    payload: {
      proposedSkuCode: 'NR-SBF-2026-004',
      proposedName: 'Aoi Tsukishiro Acrylic Charm - Spring Bloom Ver.',
      releaseChannel: 'venue lottery',
    },
    moderationStatus: 'pending',
  },
  {
    id: ids.submissionDuoFix,
    userId: demoUserIds.reviewer,
    submissionType: 'update',
    targetEntityType: 'goods',
    targetEntityId: ids.goodsDuoShikishi,
    title: 'Correct foil detail wording on duo shikishi',
    body: 'User reports that the finish is stamped foil signatures rather than full-surface foil and asks for the metadata copy to be corrected.',
    payload: {
      targetField: 'metadata.finish',
      previousValue: 'foil signature',
      proposedValue: 'stamped foil signature',
    },
    moderationStatus: 'approved',
    reviewNote: 'Approved after checking the official event sample photo.',
  },
];

export const postSeed: PostSeed[] = [
  {
    id: ids.postAoiReview,
    goodsId: ids.goodsAoiStand,
    userId: demoUserIds.collector,
    body: 'The layered sakura base catches desk lighting really well and the print alignment is clean.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postRenTradeNote,
    goodsId: ids.goodsRenBadge,
    userId: demoUserIds.trader,
    body: 'Glitter finish is stronger in person. Blind-pack duplicates make this one good exchange stock.',
    status: 'visible',
    moderationStatus: 'approved',
  },
  {
    id: ids.postDuoReview,
    goodsId: ids.goodsDuoShikishi,
    userId: demoUserIds.reviewer,
    body: 'Foil signatures and the duo composition make this the completion piece of the whole event line.',
    status: 'visible',
    moderationStatus: 'approved',
  },
];

export const postImageSeed: PostImageSeed[] = [
  {
    id: ids.postImageAoiDesk,
    postId: ids.postAoiReview,
    imageUrl: resolveSeedImageUrl(1, 'neon-requiem/community/aoi-stand-desk-1.svg'),
    storagePath: resolveSeedStoragePath(
      1,
      'legacy/demo/neon-requiem/community/aoi-stand-desk-1.webp',
    ),
    altText: 'User photo of the Aoi acrylic stand on a lit shelf.',
    sortOrder: 0,
    moderationStatus: 'approved',
  },
  {
    id: ids.postImageAoiCloseup,
    postId: ids.postAoiReview,
    imageUrl: resolveSeedImageUrl(
      1,
      'neon-requiem/community/aoi-stand-closeup-1.svg',
    ),
    storagePath: resolveSeedStoragePath(
      1,
      'legacy/demo/neon-requiem/community/aoi-stand-closeup-1.webp',
    ),
    altText: 'User close-up of the acrylic stand base and print layers.',
    sortOrder: 1,
    moderationStatus: 'approved',
  },
  {
    id: ids.postImageRenBadge,
    postId: ids.postRenTradeNote,
    imageUrl: resolveSeedImageUrl(
      2,
      'neon-requiem/community/ren-badge-pack-1.svg',
    ),
    storagePath: resolveSeedStoragePath(
      2,
      'legacy/demo/neon-requiem/community/ren-badge-pack-1.webp',
    ),
    altText: 'User photo of the Ren badge still inside a protective sleeve.',
    sortOrder: 0,
    moderationStatus: 'approved',
  },
];

export const exchangeListingSeed: ExchangeListingSeed[] = [
  {
    id: ids.exchangeRenOpen,
    goodsId: ids.goodsRenBadge,
    wantedGoodsId: ids.goodsAoiStand,
    userId: demoUserIds.trader,
    status: 'open',
    description:
      'Trading one unopened duplicate and prioritizing the Aoi acrylic stand first.',
    conditionNote: 'Unopened blind-pack pull kept in a sleeve.',
    locationHint: 'Shanghai',
    allowMulti: false,
    allowCash: false,
    fulfillmentMethod: 'either',
    moderationStatus: 'approved',
  },
  {
    id: ids.exchangeAoiPaused,
    goodsId: ids.goodsAoiStand,
    wantedGoodsId: ids.goodsDuoShikishi,
    userId: demoUserIds.collector,
    status: 'paused',
    description:
      'Paused for now, but this copy is still earmarked for a duo shikishi swap.',
    conditionNote: 'Displayed briefly, no visible scratches.',
    locationHint: 'Hangzhou',
    allowMulti: false,
    allowCash: true,
    fulfillmentMethod: 'meetup',
    moderationStatus: 'approved',
  },
];

export const demoSeedSummary = {
  ips: ipSeed.length,
  characters: characterSeed.length,
  series: seriesSeed.length,
  goods: goodsSeed.length,
  goodsImages: goodsImageSeed.length,
  tags: tagSeed.length,
  goodsTags: goodsTagSeed.length,
  goodsCharacters: goodsCharacterSeed.length,
  userGoods: userGoodsSeed.length,
  ratings: ratingSeed.length,
  catalogSubmissions: catalogSubmissionSeed.length,
  posts: postSeed.length,
  postImages: postImageSeed.length,
  exchangeListings: exchangeListingSeed.length,
} as const;
