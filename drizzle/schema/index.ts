import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
};

export const entityStatusEnum = pgEnum('entity_status', [
  'draft',
  'published',
  'archived',
]);

export const userGoodsStatusEnum = pgEnum('user_goods_status', [
  'owned',
  'wanted',
  'exchange',
]);

export const wishlistPriorityEnum = pgEnum('wishlist_priority', [
  'normal',
  'super_want',
]);

export const postStatusEnum = pgEnum('post_status', ['visible', 'hidden']);

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected',
]);

export const crawlerRunStatusEnum = pgEnum('crawler_run_status', [
  'running',
  'succeeded',
  'failed',
]);

export const crawlerRunTriggerEnum = pgEnum('crawler_run_trigger', [
  'scheduled',
  'manual',
]);

export const crawlerDraftStatusEnum = pgEnum('crawler_draft_status', [
  'pending',
  'published',
  'rejected',
]);

export const exchangeListingStatusEnum = pgEnum('exchange_listing_status', [
  'open',
  'paused',
  'closed',
]);

export const exchangeOfferPolicyEnum = pgEnum('exchange_offer_policy', [
  'wishlist_only',
  'open_to_offers',
]);

export const exchangeOfferStatusEnum = pgEnum('exchange_offer_status', [
  'pending',
  'accepted',
  'declined',
  'withdrawn',
  'expired',
]);

export const exchangeFulfillmentMethodEnum = pgEnum(
  'exchange_fulfillment_method',
  ['shipping', 'meetup', 'either'],
);

// 无资金换谷的履约状态。允许的迁移只在 lib/exchange/status.ts 中定义。
export const exchangeStatusEnum = pgEnum('exchange_status', [
  'draft',
  'proposed',
  'accepted',
  'shipping',
  'received',
  'completed',
  'cancelled',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
  'exchange_proposed',
  'exchange_accepted',
  'exchange_shipping',
  'exchange_received',
  'exchange_completed',
  'exchange_cancelled',
  'offer_received',
  'offer_countered',
  'offer_accepted',
  'offer_declined',
  'message_received',
  'watch_available',
  'report_resolved',
]);

export const reportTargetTypeEnum = pgEnum('report_target_type', [
  'post',
  'exchange_listing',
  'exchange',
  'message',
]);
export const reportStatusEnum = pgEnum('report_status', [
  'pending',
  'resolved',
  'rejected',
]);
export const coordinationStatusEnum = pgEnum('coordination_status', [
  'proposed',
  'accepted',
  'cancelled',
]);

export const ratingVerdictEnum = pgEnum('rating_verdict', [
  'positive',
  'neutral',
  'negative',
]);

export const catalogSubmissionTypeEnum = pgEnum('catalog_submission_type', [
  'create',
  'update',
]);

export const catalogSubmissionTargetTypeEnum = pgEnum(
  'catalog_submission_target_type',
  ['ip', 'character', 'series', 'goods'],
);

export const goodsImageEmbeddingStatusEnum = pgEnum(
  'goods_image_embedding_status',
  ['pending', 'ready', 'failed'],
);

export const profileVisibilityEnum = pgEnum('profile_visibility', [
  'public',
  'followers',
  'private',
]);

// 谷子的官方性质。UI 必须明确区分这些类型，避免同人 / 自制被误读为官方正版。
export const officialTypeEnum = pgEnum('official_type', [
  'official',
  'official_bonus',
  'official_limited',
  'licensed',
  'doujin',
  'self_made',
  'unknown',
]);

// SKU 数据库层的核验状态。与 Listing / 订单无关，指的是资料本身是否经过核对。
export const goodsVerificationStatusEnum = pgEnum('goods_verification_status', [
  'verified',
  'unverified',
]);

// 卖家身份。个人闲置与经营 / 企业卖家在商品页需要明确区分。
export const sellerTypeEnum = pgEnum('seller_type', ['individual', 'business']);

// 平台级统一品相体系（S/A/B/C/D）。存成单字母，展示层再补全名与描述。
// 顺序即优劣：'s' 最好，'d' 最差；求购的最低可接受品相据此比较。
export const conditionGradeEnum = pgEnum('condition_grade', [
  's',
  'a',
  'b',
  'c',
  'd',
]);

// 在售挂单的状态机。draft 预留给"存草稿再发布"；removed 是卖家自行下架，
// disputed 表示卷入纠纷被冻结。
export const listingStatusEnum = pgEnum('listing_status', [
  'draft',
  'active',
  'reserved',
  'sold',
  'cancelled',
  'removed',
  'disputed',
]);

// 求购（WTB）状态。
export const wantOrderStatusEnum = pgEnum('want_order_status', [
  'open',
  'fulfilled',
  'cancelled',
  'expired',
]);

// 订单状态机。异常分支（cancelled/refund_*/disputed/closed）与正常履约链并列，
// 历史定价订单状态仅为旧数据兼容保留；V1 运行时不再创建或推进这些订单。
export const orderStatusEnum = pgEnum('order_status', [
  'created',
  'awaiting_payment',
  'paid',
  'awaiting_shipment',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refund_requested',
  'refunded',
  'disputed',
  'closed',
]);

// 支付记录状态。真实资金由持牌支付服务处理，这里只镜像其结果。
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'refunded',
]);

/**
 * 収蔵記録的判定种类。
 * `owned_count` 是全局累计，没有作用域；其余三种针对某个具体的角色 / 系列 /
 * 作品，因此解锁记录需要 scope_id 指明是哪一个。
 */
export const achievementKindEnum = pgEnum('achievement_kind', [
  'owned_count',
  'character_complete',
  'series_complete',
  'ip_complete',
  // 品类广度：已点亮收藏覆盖了多少种不同的谷子类型（goods_type）。与 owned_count
  // 一样是全局阈值型，不绑定具体作用域。
  'type_breadth',
]);

export const ips = pgTable(
  'ips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 128 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    nameLocalized: varchar('name_localized', { length: 255 }),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    status: entityStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('ips_slug_unique').on(table.slug),
    index('ips_status_idx').on(table.status),
    index('ips_name_trgm_idx').using('gin', sql`${table.name} gin_trgm_ops`),
    index('ips_name_localized_trgm_idx').using(
      'gin',
      sql`${table.nameLocalized} gin_trgm_ops`,
    ),
  ],
);

export const characters = pgTable(
  'characters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ipId: uuid('ip_id')
      .notNull()
      .references(() => ips.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    slug: varchar('slug', { length: 128 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    nameLocalized: varchar('name_localized', { length: 255 }),
    description: text('description'),
    avatarImageUrl: text('avatar_image_url'),
    status: entityStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('characters_ip_id_slug_unique').on(table.ipId, table.slug),
    index('characters_ip_id_idx').on(table.ipId),
    index('characters_status_idx').on(table.status),
    index('characters_name_trgm_idx').using(
      'gin',
      sql`${table.name} gin_trgm_ops`,
    ),
  ],
);

export const series = pgTable(
  'series',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ipId: uuid('ip_id')
      .notNull()
      .references(() => ips.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    slug: varchar('slug', { length: 128 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    coverImageUrl: text('cover_image_url'),
    seriesType: varchar('series_type', { length: 64 })
      .notNull()
      .default('standard'),
    releaseDate: date('release_date', { mode: 'date' }),
    status: entityStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('series_ip_id_slug_unique').on(table.ipId, table.slug),
    index('series_ip_id_idx').on(table.ipId),
    index('series_status_idx').on(table.status),
    index('series_name_trgm_idx').using('gin', sql`${table.name} gin_trgm_ops`),
  ],
);

export const goods = pgTable(
  'goods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    seriesId: uuid('series_id')
      .notNull()
      .references(() => series.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    skuCode: varchar('sku_code', { length: 128 }).notNull(),
    slug: varchar('slug', { length: 160 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    goodsType: varchar('goods_type', { length: 64 }).notNull(),
    material: varchar('material', { length: 128 }),
    sizeLabel: varchar('size_label', { length: 128 }),
    edition: varchar('edition', { length: 128 }),
    releaseDate: date('release_date', { mode: 'date' }),
    msrpAmount: numeric('msrp_amount', { precision: 10, scale: 2 }),
    currencyCode: varchar('currency_code', { length: 3 }),
    manufacturer: varchar('manufacturer', { length: 128 }),
    region: varchar('region', { length: 64 }),
    officialType: officialTypeEnum('official_type')
      .notNull()
      .default('unknown'),
    verificationStatus: goodsVerificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    status: entityStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('goods_sku_code_unique').on(table.skuCode),
    uniqueIndex('goods_slug_unique').on(table.slug),
    index('goods_series_id_idx').on(table.seriesId),
    index('goods_goods_type_idx').on(table.goodsType),
    index('goods_official_type_idx').on(table.officialType),
    index('goods_status_idx').on(table.status),
    // Search matches with a leading wildcard, which no btree index can serve.
    // pg_trgm is the only option that also works on Chinese: the built-in text
    // search parser treats a run of Han characters as a single token, so
    // to_tsvector cannot match a substring, and zhparser/pg_bigm are not
    // available on managed Postgres.
    index('goods_name_trgm_idx').using('gin', sql`${table.name} gin_trgm_ops`),
    index('goods_sku_code_trgm_idx').using(
      'gin',
      sql`${table.skuCode} gin_trgm_ops`,
    ),
    index('goods_description_trgm_idx').using(
      'gin',
      sql`${table.description} gin_trgm_ops`,
    ),
    check(
      'goods_msrp_amount_non_negative_check',
      sql`${table.msrpAmount} is null or ${table.msrpAmount} >= 0`,
    ),
  ],
);

export const goodsImages = pgTable(
  'goods_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    imageUrl: text('image_url').notNull(),
    altText: varchar('alt_text', { length: 255 }),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('goods_images_goods_id_sort_order_unique').on(
      table.goodsId,
      table.sortOrder,
    ),
    index('goods_images_goods_id_idx').on(table.goodsId),
  ],
);

// Reserve a dedicated embedding index table instead of overloading goods_images.
// This keeps the authoritative image record separate from future similarity data.
export const goodsImageEmbeddings = pgTable(
  'goods_image_embeddings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsImageId: uuid('goods_image_id')
      .notNull()
      .references(() => goodsImages.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    status: goodsImageEmbeddingStatusEnum('status')
      .notNull()
      .default('pending'),
    provider: varchar('provider', { length: 64 }).notNull(),
    model: varchar('model', { length: 128 }).notNull(),
    modelVersion: varchar('model_version', { length: 64 }),
    dimensions: integer('dimensions'),
    sourceChecksum: varchar('source_checksum', { length: 128 }),
    embeddingPayload: jsonb('embedding_payload').$type<number[]>(),
    indexedAt: timestamp('indexed_at', { withTimezone: true, mode: 'date' }),
    lastError: text('last_error'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('goods_image_embeddings_image_provider_model_unique').on(
      table.goodsImageId,
      table.provider,
      table.model,
    ),
    index('goods_image_embeddings_status_idx').on(table.status),
    index('goods_image_embeddings_provider_model_idx').on(
      table.provider,
      table.model,
    ),
    check(
      'goods_image_embeddings_dimensions_positive_check',
      sql`${table.dimensions} is null or ${table.dimensions} > 0`,
    ),
  ],
);

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: varchar('slug', { length: 128 }).notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('tags_slug_unique').on(table.slug),
    uniqueIndex('tags_name_unique').on(table.name),
    index('tags_name_trgm_idx').using('gin', sql`${table.name} gin_trgm_ops`),
  ],
);

export const goodsTags = pgTable(
  'goods_tags',
  {
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: 'goods_tags_pkey',
      columns: [table.goodsId, table.tagId],
    }),
    index('goods_tags_tag_id_idx').on(table.tagId),
  ],
);

export const goodsCharacters = pgTable(
  'goods_characters',
  {
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    sortOrder: integer('sort_order').notNull().default(0),
    isPrimary: boolean('is_primary').notNull().default(false),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: 'goods_characters_pkey',
      columns: [table.goodsId, table.characterId],
    }),
    index('goods_characters_character_id_idx').on(table.characterId),
  ],
);

// Supabase auth lives outside the app schema (auth.users), which Drizzle does
// not manage, so every user_id column here is a plain UUID with no foreign key.
// `profiles` is the app-side record for a user: it carries everything the
// product needs to render an author or a collection page, keyed by the same id
// Supabase issues. Join through it rather than adding more user_id columns.
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    handle: varchar('handle', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    avatarImageUrl: text('avatar_image_url'),
    bio: text('bio'),
    city: varchar('city', { length: 64 }),
    accentTitle: varchar('accent_title', { length: 120 }),
    visibility: profileVisibilityEnum('visibility').notNull().default('public'),
    // 卖家身份。经营 / 企业卖家的鉴定与信誉体系在此之上扩展；实名与评分等
    // 派生数据从订单与评价推导，不在这里冗余存储。
    sellerType: sellerTypeEnum('seller_type').notNull().default('individual'),
    // 收藏相框是否在社交主页对外显示。自己的谷柜始终显示；这里只控制他人访问主页时是否可见。
    collectionFramesPublic: boolean('collection_frames_public')
      .notNull()
      .default(true),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('profiles_handle_unique').on(table.handle),
    index('profiles_visibility_idx').on(table.visibility),
    // Handles appear in /users/<handle>, so keep them URL-safe and lowercase.
    // The leading @ is presentation only and is not stored.
    check(
      'profiles_handle_format_check',
      sql`${table.handle} ~ '^[a-z0-9][a-z0-9._-]*[a-z0-9]$'`,
    ),
    check(
      'profiles_display_name_not_empty_check',
      sql`char_length(trim(${table.displayName})) > 0`,
    ),
  ],
);

/** 本地 PostgreSQL 认证账号。配置 Supabase 后不读取此表。 */
export const localAuthAccounts = pgTable(
  'local_auth_accounts',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    ...timestamps,
  },
  (table) => [uniqueIndex('local_auth_accounts_email_unique').on(table.email)],
);

/** 轻量单向关注；关注关系是 Feed、圈子与 followers 可见性后续能力的底座。 */
export const follows = pgTable(
  'follows',
  {
    followerId: uuid('follower_id').notNull(),
    followingId: uuid('following_id').notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: 'follows_pkey',
      columns: [table.followerId, table.followingId],
    }),
    index('follows_following_id_idx').on(table.followingId),
    check(
      'follows_distinct_users_check',
      sql`${table.followerId} <> ${table.followingId}`,
    ),
  ],
);

export const userGoods = pgTable(
  'user_goods',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    status: userGoodsStatusEnum('status').notNull(),
    quantity: integer('quantity').notNull().default(1),
    tradableQuantity: integer('tradable_quantity').notNull().default(0),
    wishlistPriority: wishlistPriorityEnum('wishlist_priority')
      .notNull()
      .default('normal'),
    note: text('note'),
    /**
     * 普通 owned 只表示已经放进谷柜；只有真实相机识别确认后才写入 lit_at。
     * 图鉴亮灯、完成度与成就应以这个时间为准。
     */
    litAt: timestamp('lit_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('user_goods_user_id_goods_id_status_unique').on(
      table.userId,
      table.goodsId,
      table.status,
    ),
    index('user_goods_user_id_idx').on(table.userId),
    index('user_goods_goods_id_idx').on(table.goodsId),
    index('user_goods_status_idx').on(table.status),
    index('user_goods_wishlist_priority_idx').on(table.wishlistPriority),
    check('user_goods_quantity_positive_check', sql`${table.quantity} >= 1`),
    check(
      'user_goods_tradable_quantity_range_check',
      sql`${table.tradableQuantity} >= 0 and ${table.tradableQuantity} <= ${table.quantity}`,
    ),
    check(
      'user_goods_lit_owned_only_check',
      sql`${table.litAt} is null or ${table.status} = 'owned'`,
    ),
  ],
);

/**
 * 自由扫描项：用户扫了实物但没匹配上官方 SKU（盗版 / 二创 / 未收录）。进个人谷柜，但
 * 不在公开主页展示——公开展示只给匹配上官方 SKU 的点亮项，以此保证展示照片的稀缺性。
 */
export const userScans = pgTable(
  'user_scans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    imageUrl: text('image_url').notNull(),
    // 最接近的官方匹配分（0–100，信息用，可为空）。
    topScore: integer('top_score'),
    note: text('note'),
    ...timestamps,
  },
  (table) => [index('user_scans_user_id_idx').on(table.userId)],
);

/**
 * 一次服务端识别结果。candidate_map 把返回给浏览器的候选 id 绑定到 SKU id；
 * 确认动作只接受 requestId + candidateId，从不接受浏览器提供的 goodsId。
 */
export const recognitionAttempts = pgTable(
  'recognition_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    source: varchar('source', { length: 16 }).notNull(),
    provider: varchar('provider', { length: 32 }).notNull(),
    candidateMap: jsonb('candidate_map')
      .$type<Record<string, string>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    confirmedCandidateId: text('confirmed_candidate_id'),
    confirmedGoodsId: uuid('confirmed_goods_id').references(() => goods.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    confirmedAt: timestamp('confirmed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (table) => [
    index('recognition_attempts_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
    index('recognition_attempts_expires_at_idx').on(table.expiresAt),
    check(
      'recognition_attempts_source_check',
      sql`${table.source} in ('camera', 'upload')`,
    ),
    check(
      'recognition_attempts_provider_check',
      sql`${table.provider} in ('mock-placeholder', 'embedding-search')`,
    ),
    check(
      'recognition_attempts_candidate_map_object_check',
      sql`jsonb_typeof(${table.candidateMap}) = 'object'`,
    ),
    check(
      'recognition_attempts_expiry_check',
      sql`${table.expiresAt} > ${table.createdAt}`,
    ),
    check(
      'recognition_attempts_confirmation_check',
      sql`(${table.confirmedAt} is null and ${table.confirmedCandidateId} is null and ${table.confirmedGoodsId} is null)
        or (${table.confirmedAt} is not null and ${table.confirmedCandidateId} is not null and ${table.confirmedGoodsId} is not null)`,
    ),
  ],
);

export const catalogSubmissions = pgTable(
  'catalog_submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    submissionType: catalogSubmissionTypeEnum('submission_type').notNull(),
    targetEntityType:
      catalogSubmissionTargetTypeEnum('target_entity_type').notNull(),
    targetEntityId: uuid('target_entity_id'),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    moderationStatus: moderationStatusEnum('moderation_status')
      .notNull()
      .default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('catalog_submissions_user_id_idx').on(table.userId),
    index('catalog_submissions_moderation_status_idx').on(
      table.moderationStatus,
    ),
    index('catalog_submissions_target_entity_idx').on(
      table.targetEntityType,
      table.targetEntityId,
    ),
    check(
      'catalog_submissions_title_not_empty_check',
      sql`char_length(trim(${table.title})) > 0`,
    ),
    check(
      'catalog_submissions_body_not_empty_check',
      sql`char_length(trim(${table.body})) > 0`,
    ),
    check(
      'catalog_submissions_target_entity_requirement_check',
      sql`(${table.submissionType} = 'create' and ${table.targetEntityId} is null) or (${table.submissionType} = 'update' and ${table.targetEntityId} is not null)`,
    ),
  ],
);

/**
 * 管理员维护的抓取白名单。三个 crawler 表均只允许服务端数据库连接访问：
 * RLS 已启用但不创建客户端 policy，因此 Supabase anon/authenticated 默认拒绝。
 */
export const crawlerSources = pgTable(
  'crawler_sources',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 120 }).notNull(),
    entryUrl: text('entry_url').notNull(),
    detailPathPattern: varchar('detail_path_pattern', { length: 255 }),
    allowedImageHosts: text('allowed_image_hosts')
      .array()
      .notNull()
      .default([]),
    enabled: boolean('enabled').notNull().default(true),
    createdBy: uuid('created_by').notNull(),
    lastScannedAt: timestamp('last_scanned_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastSucceededAt: timestamp('last_succeeded_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastError: text('last_error'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('crawler_sources_entry_url_unique').on(table.entryUrl),
    index('crawler_sources_enabled_idx')
      .on(table.enabled)
      .where(sql`${table.enabled} = true`),
    index('crawler_sources_created_by_idx').on(table.createdBy),
    check(
      'crawler_sources_name_not_empty_check',
      sql`char_length(trim(${table.name})) > 0`,
    ),
    check(
      'crawler_sources_entry_url_http_check',
      sql`${table.entryUrl} ~* '^https?://'`,
    ),
    check(
      'crawler_sources_detail_pattern_not_empty_check',
      sql`${table.detailPathPattern} is null or char_length(trim(${table.detailPathPattern})) > 0`,
    ),
  ],
).enableRLS();

export const crawlerRuns = pgTable(
  'crawler_runs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => crawlerSources.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    trigger: crawlerRunTriggerEnum('trigger').notNull(),
    scheduledFor: timestamp('scheduled_for', {
      withTimezone: true,
      mode: 'date',
    }),
    status: crawlerRunStatusEnum('status').notNull().default('running'),
    discoveredCount: integer('discovered_count').notNull().default(0),
    createdCount: integer('created_count').notNull().default(0),
    updatedCount: integer('updated_count').notNull().default(0),
    skippedCount: integer('skipped_count').notNull().default(0),
    failedCount: integer('failed_count').notNull().default(0),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp('finished_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('crawler_runs_scheduled_slot_unique')
      .on(table.sourceId, table.scheduledFor)
      .where(sql`${table.scheduledFor} is not null`),
    uniqueIndex('crawler_runs_source_running_unique')
      .on(table.sourceId)
      .where(sql`${table.status} = 'running'`),
    index('crawler_runs_source_started_at_idx').on(
      table.sourceId,
      table.startedAt,
    ),
    index('crawler_runs_status_started_at_idx').on(
      table.status,
      table.startedAt,
    ),
    check(
      'crawler_runs_trigger_schedule_check',
      sql`(${table.trigger} = 'scheduled' and ${table.scheduledFor} is not null)
        or (${table.trigger} = 'manual' and ${table.scheduledFor} is null)`,
    ),
    check(
      'crawler_runs_counts_non_negative_check',
      sql`${table.discoveredCount} >= 0 and ${table.createdCount} >= 0
        and ${table.updatedCount} >= 0 and ${table.skippedCount} >= 0
        and ${table.failedCount} >= 0`,
    ),
    check(
      'crawler_runs_status_finished_check',
      sql`(${table.status} = 'running' and ${table.finishedAt} is null)
        or (${table.status} <> 'running' and ${table.finishedAt} is not null)`,
    ),
    check(
      'crawler_runs_finished_after_started_check',
      sql`${table.finishedAt} is null or ${table.finishedAt} >= ${table.startedAt}`,
    ),
  ],
).enableRLS();

export const crawlerDrafts = pgTable(
  'crawler_drafts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => crawlerSources.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    sourceUrl: text('source_url').notNull(),
    sourceKey: varchar('source_key', { length: 255 }).notNull(),
    contentHash: varchar('content_hash', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    status: crawlerDraftStatusEnum('status').notNull().default('pending'),
    publishedGoodsId: uuid('published_goods_id').references(() => goods.id, {
      onDelete: 'restrict',
      onUpdate: 'cascade',
    }),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('crawler_drafts_source_key_unique').on(
      table.sourceId,
      table.sourceKey,
    ),
    uniqueIndex('crawler_drafts_published_goods_unique')
      .on(table.publishedGoodsId)
      .where(sql`${table.publishedGoodsId} is not null`),
    index('crawler_drafts_status_created_at_idx').on(
      table.status,
      table.createdAt,
    ),
    index('crawler_drafts_source_id_idx').on(table.sourceId),
    check(
      'crawler_drafts_source_url_http_check',
      sql`${table.sourceUrl} ~* '^https?://'`,
    ),
    check(
      'crawler_drafts_source_key_not_empty_check',
      sql`char_length(trim(${table.sourceKey})) > 0`,
    ),
    check(
      'crawler_drafts_content_hash_check',
      sql`${table.contentHash} ~ '^[0-9a-f]{64}$'`,
    ),
    check(
      'crawler_drafts_title_not_empty_check',
      sql`char_length(trim(${table.title})) > 0`,
    ),
    check(
      'crawler_drafts_payload_object_check',
      sql`jsonb_typeof(${table.payload}) = 'object'`,
    ),
    check(
      'crawler_drafts_review_state_check',
      sql`(${table.status} = 'pending' and ${table.publishedGoodsId} is null and ${table.reviewedBy} is null and ${table.reviewedAt} is null)
        or (${table.status} = 'published' and ${table.publishedGoodsId} is not null and ${table.reviewedBy} is not null and ${table.reviewedAt} is not null)
        or (${table.status} = 'rejected' and ${table.publishedGoodsId} is null and ${table.reviewedBy} is not null and ${table.reviewedAt} is not null)`,
    ),
  ],
).enableRLS();

// 断点续爬的检查点：一行 = 本轮爬取会话里已抓完并落好草稿的一个详情页 URL。进程中途终止
// 时这些行留存，重启后跳过它们、只补未完成的；整轮跑完再整体删除，让下一次全量爬重新检查
// 更新。三张采集表一样启用 RLS 且无客户端 policy。
export const crawlerCrawlProgress = pgTable(
  'crawler_crawl_progress',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => crawlerSources.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    detailUrl: text('detail_url').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('crawler_crawl_progress_source_url_unique').on(
      table.sourceId,
      table.detailUrl,
    ),
    check(
      'crawler_crawl_progress_detail_url_http_check',
      sql`${table.detailUrl} ~* '^https?://'`,
    ),
  ],
).enableRLS();

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id').notNull(),
    body: text('body').notNull(),
    status: postStatusEnum('status').notNull().default('visible'),
    moderationStatus: moderationStatusEnum('moderation_status')
      .notNull()
      .default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('posts_goods_id_idx').on(table.goodsId),
    index('posts_user_id_idx').on(table.userId),
    index('posts_status_idx').on(table.status),
    index('posts_moderation_status_idx').on(table.moderationStatus),
    check(
      'posts_body_not_empty_check',
      sql`char_length(trim(${table.body})) > 0`,
    ),
  ],
);

export const postImages = pgTable(
  'post_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    imageUrl: text('image_url').notNull(),
    storagePath: text('storage_path').notNull(),
    altText: varchar('alt_text', { length: 255 }),
    status: postStatusEnum('status').notNull().default('visible'),
    moderationStatus: moderationStatusEnum('moderation_status')
      .notNull()
      .default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('post_images_post_id_sort_order_unique').on(
      table.postId,
      table.sortOrder,
    ),
    index('post_images_post_id_idx').on(table.postId),
    index('post_images_status_idx').on(table.status),
    index('post_images_moderation_status_idx').on(table.moderationStatus),
  ],
);

export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id').notNull(),
    score: numeric('score', { precision: 4, scale: 2 }).notNull(),
    artworkScore: smallint('artwork_score').notNull(),
    craftsmanshipScore: smallint('craftsmanship_score').notNull(),
    valueScore: smallint('value_score').notNull(),
    rarityScore: smallint('rarity_score').notNull(),
    satisfactionScore: smallint('satisfaction_score').notNull(),
    worthBuying: boolean('worth_buying').notNull().default(false),
    overallTag: ratingVerdictEnum('overall_tag').notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('ratings_user_id_goods_id_unique').on(
      table.userId,
      table.goodsId,
    ),
    index('ratings_goods_id_idx').on(table.goodsId),
    check('ratings_score_range_check', sql`${table.score} between 1 and 5`),
    check(
      'ratings_artwork_score_range_check',
      sql`${table.artworkScore} between 1 and 5`,
    ),
    check(
      'ratings_craftsmanship_score_range_check',
      sql`${table.craftsmanshipScore} between 1 and 5`,
    ),
    check(
      'ratings_value_score_range_check',
      sql`${table.valueScore} between 1 and 5`,
    ),
    check(
      'ratings_rarity_score_range_check',
      sql`${table.rarityScore} between 1 and 5`,
    ),
    check(
      'ratings_satisfaction_score_range_check',
      sql`${table.satisfactionScore} between 1 and 5`,
    ),
  ],
);

export const exchangeListings = pgTable(
  'exchange_listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    wantedGoodsId: uuid('wanted_goods_id').references(() => goods.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    userId: uuid('user_id').notNull(),
    status: exchangeListingStatusEnum('status').notNull().default('open'),
    offeredQuantity: integer('offered_quantity').notNull().default(1),
    offerPolicy: exchangeOfferPolicyEnum('offer_policy')
      .notNull()
      .default('wishlist_only'),
    description: text('description').notNull(),
    conditionNote: text('condition_note'),
    locationHint: varchar('location_hint', { length: 128 }),
    allowMulti: boolean('allow_multi').notNull().default(false),
    allowCash: boolean('allow_cash').notNull().default(false),
    fulfillmentMethod: exchangeFulfillmentMethodEnum('fulfillment_method')
      .notNull()
      .default('either'),
    moderationStatus: moderationStatusEnum('moderation_status')
      .notNull()
      .default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('exchange_listings_goods_id_idx').on(table.goodsId),
    index('exchange_listings_wanted_goods_id_idx').on(table.wantedGoodsId),
    index('exchange_listings_user_id_idx').on(table.userId),
    index('exchange_listings_status_idx').on(table.status),
    index('exchange_listings_offer_policy_idx').on(table.offerPolicy),
    index('exchange_listings_moderation_status_idx').on(table.moderationStatus),
    index('exchange_listings_fulfillment_method_idx').on(
      table.fulfillmentMethod,
    ),
    uniqueIndex('exchange_listings_user_goods_active_unique')
      .on(table.userId, table.goodsId)
      .where(sql`${table.status} in ('open', 'paused')`),
    check(
      'exchange_listings_description_not_empty_check',
      sql`char_length(trim(${table.description})) > 0`,
    ),
    check(
      'exchange_listings_goods_pair_check',
      sql`${table.wantedGoodsId} is null or ${table.wantedGoodsId} <> ${table.goodsId}`,
    ),
    check(
      'exchange_listings_offered_quantity_positive_check',
      sql`${table.offeredQuantity} >= 1`,
    ),
    check(
      'exchange_listings_cash_disabled_check',
      sql`${table.allowCash} = false`,
    ),
  ],
);

/**
 * 一次双方换谷提案。它与公开的 exchange_listings 分开：前者是撮合入口，
 * 此表是双方确认后不可随商品资料变化而改变的履约记录。
 */
export const exchanges = pgTable(
  'exchanges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiatorId: uuid('initiator_id').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    offeredGoodsId: uuid('offered_goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    requestedGoodsId: uuid('requested_goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    offeredQuantity: integer('offered_quantity').notNull().default(1),
    requestedQuantity: integer('requested_quantity').notNull().default(1),
    status: exchangeStatusEnum('status').notNull().default('draft'),
    fulfillmentMethod: exchangeFulfillmentMethodEnum('fulfillment_method')
      .notNull()
      .default('either'),
    /** 发起时固化 SKU 名称、图片、编码等公开资料。 */
    offeredGoodsSnapshot: jsonb('offered_goods_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    requestedGoodsSnapshot: jsonb('requested_goods_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    /** 双方各自提供的品相说明在提案时固化，避免履约期间被修改。 */
    initiatorConditionSnapshot: jsonb('initiator_condition_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    recipientConditionSnapshot: jsonb('recipient_condition_snapshot').$type<
      Record<string, unknown>
    >(),
    note: text('note'),
    proposedAt: timestamp('proposed_at', { withTimezone: true, mode: 'date' }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    shippedAt: timestamp('shipped_at', { withTimezone: true, mode: 'date' }),
    receivedAt: timestamp('received_at', { withTimezone: true, mode: 'date' }),
    initiatorShippedAt: timestamp('initiator_shipped_at', {
      withTimezone: true,
      mode: 'date',
    }),
    recipientShippedAt: timestamp('recipient_shipped_at', {
      withTimezone: true,
      mode: 'date',
    }),
    initiatorReceivedAt: timestamp('initiator_received_at', {
      withTimezone: true,
      mode: 'date',
    }),
    recipientReceivedAt: timestamp('recipient_received_at', {
      withTimezone: true,
      mode: 'date',
    }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    cancelledAt: timestamp('cancelled_at', {
      withTimezone: true,
      mode: 'date',
    }),
    inventoryReservedAt: timestamp('inventory_reserved_at', {
      withTimezone: true,
      mode: 'date',
    }),
    inventoryReleasedAt: timestamp('inventory_released_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (table) => [
    index('exchanges_initiator_id_idx').on(table.initiatorId),
    index('exchanges_recipient_id_idx').on(table.recipientId),
    index('exchanges_status_idx').on(table.status),
    index('exchanges_offered_goods_id_idx').on(table.offeredGoodsId),
    index('exchanges_requested_goods_id_idx').on(table.requestedGoodsId),
    check(
      'exchanges_distinct_users_check',
      sql`${table.initiatorId} <> ${table.recipientId}`,
    ),
    check(
      'exchanges_distinct_goods_check',
      sql`${table.offeredGoodsId} <> ${table.requestedGoodsId}`,
    ),
    check(
      'exchanges_quantities_positive_check',
      sql`${table.offeredQuantity} >= 1 and ${table.requestedQuantity} >= 1`,
    ),
    check(
      'exchanges_active_inventory_reserved_check',
      sql`${table.status} not in ('accepted', 'shipping', 'received') or (${table.inventoryReservedAt} is not null and ${table.inventoryReleasedAt} is null)`,
    ),
  ],
);

/**
 * 一条可协商的换谷出价。公开换谷帖与双向匹配都进入同一条协商链；
 * 初始方案不计议价，counter_count 只记录双方反提次数，数据库硬限制为 3。
 */
export const exchangeOffers = pgTable(
  'exchange_offers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id').references(() => exchangeListings.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    proposerId: uuid('proposer_id').notNull(),
    recipientId: uuid('recipient_id').notNull(),
    status: exchangeOfferStatusEnum('status').notNull().default('pending'),
    awaitingUserId: uuid('awaiting_user_id').notNull(),
    counterCount: smallint('counter_count').notNull().default(0),
    acceptedExchangeId: uuid('accepted_exchange_id').references(
      () => exchanges.id,
      { onDelete: 'set null', onUpdate: 'cascade' },
    ),
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('exchange_offers_listing_id_idx').on(table.listingId),
    index('exchange_offers_proposer_id_idx').on(table.proposerId),
    index('exchange_offers_recipient_id_idx').on(table.recipientId),
    index('exchange_offers_awaiting_user_id_idx').on(table.awaitingUserId),
    index('exchange_offers_status_updated_at_idx').on(
      table.status,
      table.updatedAt,
    ),
    uniqueIndex('exchange_offers_listing_proposer_unique')
      .on(table.listingId, table.proposerId)
      .where(sql`${table.listingId} is not null`),
    uniqueIndex('exchange_offers_direct_active_unique')
      .on(table.proposerId, table.recipientId)
      .where(sql`${table.listingId} is null and ${table.status} = 'pending'`),
    uniqueIndex('exchange_offers_direct_pair_active_unique')
      .on(
        sql`least(${table.proposerId}::text, ${table.recipientId}::text)`,
        sql`greatest(${table.proposerId}::text, ${table.recipientId}::text)`,
      )
      .where(sql`${table.listingId} is null and ${table.status} = 'pending'`),
    check(
      'exchange_offers_distinct_users_check',
      sql`${table.proposerId} <> ${table.recipientId}`,
    ),
    check(
      'exchange_offers_awaiting_participant_check',
      sql`${table.awaitingUserId} = ${table.proposerId} or ${table.awaitingUserId} = ${table.recipientId}`,
    ),
    check(
      'exchange_offers_counter_count_range_check',
      sql`${table.counterCount} between 0 and 3`,
    ),
  ],
);

/** 不可变的协商版本；revision_number=0 是初始出价，1..3 是反提。 */
export const exchangeOfferRevisions = pgTable(
  'exchange_offer_revisions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    offerId: uuid('offer_id')
      .notNull()
      .references(() => exchangeOffers.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    revisionNumber: smallint('revision_number').notNull(),
    actorId: uuid('actor_id').notNull(),
    offeredGoodsId: uuid('offered_goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    requestedGoodsId: uuid('requested_goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    offeredQuantity: integer('offered_quantity').notNull().default(1),
    requestedQuantity: integer('requested_quantity').notNull().default(1),
    fulfillmentMethod: exchangeFulfillmentMethodEnum('fulfillment_method')
      .notNull()
      .default('either'),
    offeredConditionNote: text('offered_condition_note'),
    requestedConditionNote: text('requested_condition_note'),
    message: text('message'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('exchange_offer_revisions_offer_number_unique').on(
      table.offerId,
      table.revisionNumber,
    ),
    index('exchange_offer_revisions_offer_created_idx').on(
      table.offerId,
      table.createdAt,
    ),
    index('exchange_offer_revisions_offered_goods_idx').on(
      table.offeredGoodsId,
    ),
    index('exchange_offer_revisions_requested_goods_idx').on(
      table.requestedGoodsId,
    ),
    check(
      'exchange_offer_revisions_number_range_check',
      sql`${table.revisionNumber} between 0 and 3`,
    ),
    check(
      'exchange_offer_revisions_distinct_goods_check',
      sql`${table.offeredGoodsId} <> ${table.requestedGoodsId}`,
    ),
    check(
      'exchange_offer_revisions_quantities_positive_check',
      sql`${table.offeredQuantity} >= 1 and ${table.requestedQuantity} >= 1`,
    ),
    check(
      'exchange_offer_revisions_message_not_blank_check',
      sql`${table.message} is null or char_length(trim(${table.message})) > 0`,
    ),
  ],
);

/** 每对用户只有一个私信会话；成员顺序由服务端按 UUID 字符串排序。 */
export const directConversations = pgTable(
  'direct_conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    memberAId: uuid('member_a_id').notNull(),
    memberBId: uuid('member_b_id').notNull(),
    lastMessageAt: timestamp('last_message_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('direct_conversations_members_unique').on(
      table.memberAId,
      table.memberBId,
    ),
    index('direct_conversations_member_a_updated_idx').on(
      table.memberAId,
      table.updatedAt,
    ),
    index('direct_conversations_member_b_updated_idx').on(
      table.memberBId,
      table.updatedAt,
    ),
    check(
      'direct_conversations_member_order_check',
      sql`${table.memberAId}::text < ${table.memberBId}::text`,
    ),
  ],
);

export const directMessages = pgTable(
  'direct_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => directConversations.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    senderId: uuid('sender_id').notNull(),
    body: text('body').notNull(),
    status: postStatusEnum('status').notNull().default('visible'),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('direct_messages_conversation_created_idx').on(
      table.conversationId,
      table.createdAt,
    ),
    index('direct_messages_sender_id_idx').on(table.senderId),
    index('direct_messages_unread_idx')
      .on(table.conversationId, table.createdAt)
      .where(sql`${table.readAt} is null`),
    check(
      'direct_messages_body_length_check',
      sql`char_length(trim(${table.body})) between 1 and 1000`,
    ),
  ],
);

/** 屏蔽是私信的硬边界：任一方向存在记录时都不能新建会话或继续发信。 */
export const userBlocks = pgTable(
  'user_blocks',
  {
    blockerId: uuid('blocker_id').notNull(),
    blockedId: uuid('blocked_id').notNull(),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: 'user_blocks_pkey',
      columns: [table.blockerId, table.blockedId],
    }),
    index('user_blocks_blocked_id_idx').on(table.blockedId),
    check(
      'user_blocks_distinct_users_check',
      sql`${table.blockerId} <> ${table.blockedId}`,
    ),
  ],
);

/** 站内通知先只承载换谷履约事件；不把消息正文或私密联系方式写入这里。 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id').notNull(),
    actorId: uuid('actor_id'),
    type: notificationTypeEnum('type').notNull(),
    exchangeId: uuid('exchange_id').references(() => exchanges.id, {
      onDelete: 'cascade',
      onUpdate: 'cascade',
    }),
    conversationId: uuid('conversation_id').references(
      () => directConversations.id,
      { onDelete: 'cascade', onUpdate: 'cascade' },
    ),
    payload: jsonb('payload')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('notifications_recipient_created_at_idx').on(
      table.recipientId,
      table.createdAt,
    ),
    index('notifications_exchange_id_idx').on(table.exchangeId),
    index('notifications_conversation_id_idx').on(table.conversationId),
    index('notifications_unread_recipient_idx')
      .on(table.recipientId, table.createdAt)
      .where(sql`${table.readAt} is null`),
  ],
);

export const exchangeReviews = pgTable(
  'exchange_reviews',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    exchangeId: uuid('exchange_id')
      .notNull()
      .references(() => exchanges.id, { onDelete: 'cascade' }),
    reviewerId: uuid('reviewer_id').notNull(),
    revieweeId: uuid('reviewee_id').notNull(),
    score: smallint('score').notNull(),
    note: text('note'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('exchange_reviews_exchange_reviewer_unique').on(
      table.exchangeId,
      table.reviewerId,
    ),
    index('exchange_reviews_reviewee_idx').on(table.revieweeId),
    check(
      'exchange_reviews_score_range_check',
      sql`${table.score} between 1 and 5`,
    ),
    check(
      'exchange_reviews_distinct_users_check',
      sql`${table.reviewerId} <> ${table.revieweeId}`,
    ),
  ],
);

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: uuid('reporter_id').notNull(),
    targetType: reportTargetTypeEnum('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: varchar('reason', { length: 64 }).notNull(),
    details: text('details'),
    status: reportStatusEnum('status').notNull().default('pending'),
    resolutionNote: text('resolution_note'),
    resolvedBy: uuid('resolved_by'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('reports_status_created_idx').on(table.status, table.createdAt),
    index('reports_reporter_idx').on(table.reporterId),
    index('reports_target_idx').on(table.targetType, table.targetId),
    uniqueIndex('reports_pending_reporter_target_unique')
      .on(table.reporterId, table.targetType, table.targetId)
      .where(sql`${table.status} = 'pending'`),
  ],
);

export const goodsWatches = pgTable(
  'goods_watches',
  {
    userId: uuid('user_id').notNull(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      name: 'goods_watches_pkey',
      columns: [table.userId, table.goodsId],
    }),
    index('goods_watches_goods_idx').on(table.goodsId),
  ],
);

export const coordinationProposals = pgTable(
  'coordination_proposals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    initiatorId: uuid('initiator_id').notNull(),
    participantIds: uuid('participant_ids').array().notNull(),
    acceptedUserIds: uuid('accepted_user_ids').array().notNull().default([]),
    cycleSnapshot: jsonb('cycle_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    status: coordinationStatusEnum('status').notNull().default('proposed'),
    ...timestamps,
  },
  (table) => [
    index('coordination_proposals_initiator_idx').on(table.initiatorId),
  ],
);

export const ipsRelations = relations(ips, ({ many }) => ({
  characters: many(characters),
  series: many(series),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
  ip: one(ips, {
    fields: [characters.ipId],
    references: [ips.id],
  }),
  goodsCharacters: many(goodsCharacters),
}));

export const seriesRelations = relations(series, ({ one, many }) => ({
  ip: one(ips, {
    fields: [series.ipId],
    references: [ips.id],
  }),
  goods: many(goods),
}));

export const goodsRelations = relations(goods, ({ one, many }) => ({
  series: one(series, {
    fields: [goods.seriesId],
    references: [series.id],
  }),
  images: many(goodsImages),
  tags: many(goodsTags),
  characters: many(goodsCharacters),
  userStates: many(userGoods),
  posts: many(posts),
  ratings: many(ratings),
  offeredExchangeListings: many(exchangeListings, {
    relationName: 'exchange_listing_offered_goods',
  }),
  wantedExchangeListings: many(exchangeListings, {
    relationName: 'exchange_listing_wanted_goods',
  }),
  confirmedRecognitionAttempts: many(recognitionAttempts),
  publishedCrawlerDrafts: many(crawlerDrafts),
}));

export const goodsImagesRelations = relations(goodsImages, ({ one, many }) => ({
  goods: one(goods, {
    fields: [goodsImages.goodsId],
    references: [goods.id],
  }),
  embeddings: many(goodsImageEmbeddings),
}));

export const goodsImageEmbeddingsRelations = relations(
  goodsImageEmbeddings,
  ({ one }) => ({
    goodsImage: one(goodsImages, {
      fields: [goodsImageEmbeddings.goodsImageId],
      references: [goodsImages.id],
    }),
  }),
);

export const tagsRelations = relations(tags, ({ many }) => ({
  goodsTags: many(goodsTags),
}));

export const goodsTagsRelations = relations(goodsTags, ({ one }) => ({
  goods: one(goods, {
    fields: [goodsTags.goodsId],
    references: [goods.id],
  }),
  tag: one(tags, {
    fields: [goodsTags.tagId],
    references: [tags.id],
  }),
}));

export const goodsCharactersRelations = relations(
  goodsCharacters,
  ({ one }) => ({
    goods: one(goods, {
      fields: [goodsCharacters.goodsId],
      references: [goods.id],
    }),
    character: one(characters, {
      fields: [goodsCharacters.characterId],
      references: [characters.id],
    }),
  }),
);

export const profilesRelations = relations(profiles, ({ many }) => ({
  userStates: many(userGoods),
  posts: many(posts),
  ratings: many(ratings),
  exchangeListings: many(exchangeListings),
  recognitionAttempts: many(recognitionAttempts),
}));

export const userGoodsRelations = relations(userGoods, ({ one }) => ({
  goods: one(goods, {
    fields: [userGoods.goodsId],
    references: [goods.id],
  }),
  profile: one(profiles, {
    fields: [userGoods.userId],
    references: [profiles.id],
  }),
}));

export const recognitionAttemptsRelations = relations(
  recognitionAttempts,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [recognitionAttempts.userId],
      references: [profiles.id],
    }),
    confirmedGoods: one(goods, {
      fields: [recognitionAttempts.confirmedGoodsId],
      references: [goods.id],
    }),
  }),
);

export const crawlerSourcesRelations = relations(
  crawlerSources,
  ({ many }) => ({
    runs: many(crawlerRuns),
    drafts: many(crawlerDrafts),
  }),
);

export const crawlerRunsRelations = relations(crawlerRuns, ({ one }) => ({
  source: one(crawlerSources, {
    fields: [crawlerRuns.sourceId],
    references: [crawlerSources.id],
  }),
}));

export const crawlerDraftsRelations = relations(crawlerDrafts, ({ one }) => ({
  source: one(crawlerSources, {
    fields: [crawlerDrafts.sourceId],
    references: [crawlerSources.id],
  }),
  publishedGoods: one(goods, {
    fields: [crawlerDrafts.publishedGoodsId],
    references: [goods.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  goods: one(goods, {
    fields: [posts.goodsId],
    references: [goods.id],
  }),
  profile: one(profiles, {
    fields: [posts.userId],
    references: [profiles.id],
  }),
  images: many(postImages),
}));

export const postImagesRelations = relations(postImages, ({ one }) => ({
  post: one(posts, {
    fields: [postImages.postId],
    references: [posts.id],
  }),
}));

export const ratingsRelations = relations(ratings, ({ one }) => ({
  goods: one(goods, {
    fields: [ratings.goodsId],
    references: [goods.id],
  }),
  profile: one(profiles, {
    fields: [ratings.userId],
    references: [profiles.id],
  }),
}));

export const exchangeListingsRelations = relations(
  exchangeListings,
  ({ one }) => ({
    profile: one(profiles, {
      fields: [exchangeListings.userId],
      references: [profiles.id],
    }),
    goods: one(goods, {
      fields: [exchangeListings.goodsId],
      references: [goods.id],
      relationName: 'exchange_listing_offered_goods',
    }),
    wantedGoods: one(goods, {
      fields: [exchangeListings.wantedGoodsId],
      references: [goods.id],
      relationName: 'exchange_listing_wanted_goods',
    }),
  }),
);

/**
 * 収蔵記録的定义。内容由 seed 维护，不经用户输入。
 */
export const achievements = pgTable(
  'achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    code: varchar('code', { length: 64 }).notNull(),
    name: varchar('name', { length: 120 }).notNull(),
    description: varchar('description', { length: 255 }).notNull(),
    kind: achievementKindEnum('kind').notNull(),
    /** 仅 `owned_count` 使用：累计到多少件时达成。 */
    threshold: integer('threshold'),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('achievements_code_unique').on(table.code),
    index('achievements_kind_idx').on(table.kind),
    // 阈值型（owned_count / type_breadth）必须有正阈值，其余种类不该有 ——
    // 让数据库挡住定义错误的记录。用 kind::text 比较，避免约束在「同一迁移里
    // 刚 ADD 的枚举值」上触发 Postgres 的 unsafe-use-of-new-value 限制。
    check(
      'achievements_threshold_matches_kind_check',
      sql`(kind::text in ('owned_count', 'type_breadth') and threshold is not null and threshold > 0)
          or (kind::text not in ('owned_count', 'type_breadth') and threshold is null)`,
    ),
  ],
);

/**
 * 用户的解锁记录。达成即写入，不再变更。
 */
export const userAchievements = pgTable(
  'user_achievements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    achievementId: uuid('achievement_id')
      .notNull()
      .references(() => achievements.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    /** 角色 / 系列 / 作品的 id；`owned_count` 类记录为 null。 */
    scopeId: uuid('scope_id'),
    achievedAt: timestamp('achieved_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    // Postgres 里 NULL 彼此不相等，所以单个 unique(user, achievement, scope)
    // 挡不住 scope_id 为 NULL 的重复行。NULLS NOT DISTINCT 要 PG15，这里用
    // 两个部分索引，PG12 起都成立。
    uniqueIndex('user_achievements_global_unique')
      .on(table.userId, table.achievementId)
      .where(sql`scope_id is null`),
    uniqueIndex('user_achievements_scoped_unique')
      .on(table.userId, table.achievementId, table.scopeId)
      .where(sql`scope_id is not null`),
    index('user_achievements_user_id_idx').on(table.userId),
    index('user_achievements_achieved_at_idx').on(table.achievedAt),
  ],
);

export const achievementsRelations = relations(achievements, ({ many }) => ({
  unlocks: many(userAchievements),
}));

export const userAchievementsRelations = relations(
  userAchievements,
  ({ one }) => ({
    achievement: one(achievements, {
      fields: [userAchievements.achievementId],
      references: [achievements.id],
    }),
  }),
);

/* ============================================================================
   市场层。谷子 SKU 是数据中心，下面这些表都挂在 goods 之下：
     listings           某个 SKU 的一条在售挂单（有价、有品相、有数量）
     listing_photos     挂单的实物照片
     want_orders        某个 SKU 的一条求购（WTB）
     orders             一次交易，创建时对 listing / goods / 地址做快照
     payments           支付记录，真实资金由持牌支付服务处理，这里只镜像结果
     market_transactions 成交记录 —— SKU 市场统计（最近成交、均价、区间）的来源
   卖家不新建 SKU，只在既有 SKU 下挂 listing。
   ========================================================================= */

export const listings = pgTable(
  'listings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    sellerId: uuid('seller_id').notNull(),
    status: listingStatusEnum('status').notNull().default('active'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 })
      .notNull()
      .default('CNY'),
    quantity: integer('quantity').notNull().default(1),
    conditionGrade: conditionGradeEnum('condition_grade').notNull(),
    conditionDetails: text('condition_details'),
    shippingMethod: varchar('shipping_method', { length: 64 })
      .notNull()
      .default('shipping'),
    shippingFee: numeric('shipping_fee', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    description: text('description'),
    // 事后审核模型：挂单默认可见，被举报 / 审核判定后再下架，这样发布即时可用，
    // 又保留治理入口。rejected 的挂单在市场查询里被过滤掉。
    moderationStatus: moderationStatusEnum('moderation_status')
      .notNull()
      .default('approved'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('listings_goods_id_idx').on(table.goodsId),
    index('listings_seller_id_idx').on(table.sellerId),
    index('listings_status_idx').on(table.status),
    // 最低在售价：按 SKU + 状态过滤后取最小价，复合索引直接服务它。
    index('listings_goods_status_price_idx').on(
      table.goodsId,
      table.status,
      table.price,
    ),
    check('listings_price_non_negative_check', sql`${table.price} >= 0`),
    check(
      'listings_shipping_fee_non_negative_check',
      sql`${table.shippingFee} >= 0`,
    ),
    check('listings_quantity_positive_check', sql`${table.quantity} >= 1`),
  ],
);

export const listingPhotos = pgTable(
  'listing_photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    listingId: uuid('listing_id')
      .notNull()
      .references(() => listings.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    imageUrl: text('image_url').notNull(),
    storagePath: text('storage_path'),
    altText: varchar('alt_text', { length: 255 }),
    // 品相举证要求按类目拍摄不同角度（正面 / 背面 / 背针 / 包装 / 瑕疵…）。
    photoAngle: varchar('photo_angle', { length: 48 }),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('listing_photos_listing_id_sort_order_unique').on(
      table.listingId,
      table.sortOrder,
    ),
    index('listing_photos_listing_id_idx').on(table.listingId),
  ],
);

export const wantOrders = pgTable(
  'want_orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    userId: uuid('user_id').notNull(),
    status: wantOrderStatusEnum('status').notNull().default('open'),
    // 最高可接受价，可空表示不设上限。
    maxPrice: numeric('max_price', { precision: 10, scale: 2 }),
    currencyCode: varchar('currency_code', { length: 3 })
      .notNull()
      .default('CNY'),
    // 最低可接受品相，默认 'd'（全收）。
    minConditionGrade: conditionGradeEnum('min_condition_grade')
      .notNull()
      .default('d'),
    quantity: integer('quantity').notNull().default(1),
    region: varchar('region', { length: 64 }),
    note: text('note'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [
    index('want_orders_goods_id_idx').on(table.goodsId),
    index('want_orders_user_id_idx').on(table.userId),
    index('want_orders_status_idx').on(table.status),
    check(
      'want_orders_max_price_non_negative_check',
      sql`${table.maxPrice} is null or ${table.maxPrice} >= 0`,
    ),
    check('want_orders_quantity_positive_check', sql`${table.quantity} >= 1`),
  ],
);

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderNo: varchar('order_no', { length: 32 }).notNull(),
    buyerId: uuid('buyer_id').notNull(),
    sellerId: uuid('seller_id').notNull(),
    // 挂单可能在成交后被清理，因此 set null；商品与价格已在快照里固化。
    listingId: uuid('listing_id').references(() => listings.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    // 历史订单必须能追溯到 SKU，所以禁止删除仍有订单的 SKU。
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    quantity: integer('quantity').notNull().default(1),
    itemPrice: numeric('item_price', { precision: 10, scale: 2 }).notNull(),
    shippingFee: numeric('shipping_fee', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    platformFee: numeric('platform_fee', { precision: 10, scale: 2 })
      .notNull()
      .default('0'),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 })
      .notNull()
      .default('CNY'),
    conditionGrade: conditionGradeEnum('condition_grade').notNull(),
    status: orderStatusEnum('status').notNull().default('created'),
    // 下单即固化：即便原 listing / SKU 后续被改，历史订单仍保留原始信息。
    listingSnapshot: jsonb('listing_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    goodsSnapshot: jsonb('goods_snapshot')
      .$type<Record<string, unknown>>()
      .notNull(),
    addressSnapshot: jsonb('address_snapshot').$type<Record<string, unknown>>(),
    paymentProvider: varchar('payment_provider', { length: 64 }),
    paymentReference: varchar('payment_reference', { length: 128 }),
    shippingCarrier: varchar('shipping_carrier', { length: 64 }),
    trackingNo: varchar('tracking_no', { length: 128 }),
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
    shippedAt: timestamp('shipped_at', { withTimezone: true, mode: 'date' }),
    deliveredAt: timestamp('delivered_at', {
      withTimezone: true,
      mode: 'date',
    }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    cancelledAt: timestamp('cancelled_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('orders_order_no_unique').on(table.orderNo),
    index('orders_buyer_id_idx').on(table.buyerId),
    index('orders_seller_id_idx').on(table.sellerId),
    index('orders_goods_id_idx').on(table.goodsId),
    index('orders_status_idx').on(table.status),
    check(
      'orders_total_price_non_negative_check',
      sql`${table.totalPrice} >= 0`,
    ),
    check('orders_quantity_positive_check', sql`${table.quantity} >= 1`),
  ],
);

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    provider: varchar('provider', { length: 64 }).notNull(),
    providerReference: varchar('provider_reference', { length: 128 }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 })
      .notNull()
      .default('CNY'),
    status: paymentStatusEnum('status').notNull().default('pending'),
    rawPayload: jsonb('raw_payload').$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (table) => [
    index('payments_order_id_idx').on(table.orderId),
    index('payments_provider_reference_idx').on(table.providerReference),
  ],
);

export const marketTransactions = pgTable(
  'market_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    goodsId: uuid('goods_id')
      .notNull()
      .references(() => goods.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
      }),
    orderId: uuid('order_id').references(() => orders.id, {
      onDelete: 'set null',
      onUpdate: 'cascade',
    }),
    sellerId: uuid('seller_id').notNull(),
    buyerId: uuid('buyer_id').notNull(),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currencyCode: varchar('currency_code', { length: 3 })
      .notNull()
      .default('CNY'),
    quantity: integer('quantity').notNull().default(1),
    conditionGrade: conditionGradeEnum('condition_grade').notNull(),
    soldAt: timestamp('sold_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
    ...timestamps,
  },
  (table) => [
    index('market_transactions_goods_id_idx').on(table.goodsId),
    // 成交历史与近 30 日统计都按 SKU + 时间倒序取，复合索引直接服务它。
    index('market_transactions_goods_sold_at_idx').on(
      table.goodsId,
      table.soldAt,
    ),
    index('market_transactions_seller_id_idx').on(table.sellerId),
    index('market_transactions_buyer_id_idx').on(table.buyerId),
    check(
      'market_transactions_price_non_negative_check',
      sql`${table.price} >= 0`,
    ),
  ],
);

export const listingsRelations = relations(listings, ({ one, many }) => ({
  goods: one(goods, {
    fields: [listings.goodsId],
    references: [goods.id],
  }),
  seller: one(profiles, {
    fields: [listings.sellerId],
    references: [profiles.id],
  }),
  photos: many(listingPhotos),
  orders: many(orders),
}));

export const listingPhotosRelations = relations(listingPhotos, ({ one }) => ({
  listing: one(listings, {
    fields: [listingPhotos.listingId],
    references: [listings.id],
  }),
}));

export const wantOrdersRelations = relations(wantOrders, ({ one }) => ({
  goods: one(goods, {
    fields: [wantOrders.goodsId],
    references: [goods.id],
  }),
  requester: one(profiles, {
    fields: [wantOrders.userId],
    references: [profiles.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  goods: one(goods, {
    fields: [orders.goodsId],
    references: [goods.id],
  }),
  listing: one(listings, {
    fields: [orders.listingId],
    references: [listings.id],
  }),
  buyer: one(profiles, {
    fields: [orders.buyerId],
    references: [profiles.id],
    relationName: 'order_buyer',
  }),
  seller: one(profiles, {
    fields: [orders.sellerId],
    references: [profiles.id],
    relationName: 'order_seller',
  }),
  payments: many(payments),
  transaction: many(marketTransactions),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));

export const marketTransactionsRelations = relations(
  marketTransactions,
  ({ one }) => ({
    goods: one(goods, {
      fields: [marketTransactions.goodsId],
      references: [goods.id],
    }),
    order: one(orders, {
      fields: [marketTransactions.orderId],
      references: [orders.id],
    }),
  }),
);

export type Listing = typeof listings.$inferSelect;
export type ListingPhoto = typeof listingPhotos.$inferSelect;
export type WantOrder = typeof wantOrders.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type MarketTransaction = typeof marketTransactions.$inferSelect;

export type Achievement = typeof achievements.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;

export type Ip = typeof ips.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Series = typeof series.$inferSelect;
export type Good = typeof goods.$inferSelect;
export type GoodImage = typeof goodsImages.$inferSelect;
export type GoodImageEmbedding = typeof goodsImageEmbeddings.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type UserGood = typeof userGoods.$inferSelect;
export type RecognitionAttempt = typeof recognitionAttempts.$inferSelect;
export type CatalogSubmission = typeof catalogSubmissions.$inferSelect;
export type CrawlerSource = typeof crawlerSources.$inferSelect;
export type CrawlerRun = typeof crawlerRuns.$inferSelect;
export type CrawlerDraft = typeof crawlerDrafts.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostImage = typeof postImages.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type ExchangeListing = typeof exchangeListings.$inferSelect;
export type Exchange = typeof exchanges.$inferSelect;
export type ExchangeOffer = typeof exchangeOffers.$inferSelect;
export type ExchangeOfferRevision = typeof exchangeOfferRevisions.$inferSelect;
export type DirectConversation = typeof directConversations.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;
export type UserBlock = typeof userBlocks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type ExchangeReview = typeof exchangeReviews.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type GoodsWatch = typeof goodsWatches.$inferSelect;
export type CoordinationProposal = typeof coordinationProposals.$inferSelect;
