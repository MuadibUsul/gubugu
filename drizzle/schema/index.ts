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

export const postStatusEnum = pgEnum('post_status', ['visible', 'hidden']);

export const moderationStatusEnum = pgEnum('moderation_status', [
  'pending',
  'approved',
  'rejected',
]);

export const exchangeListingStatusEnum = pgEnum('exchange_listing_status', [
  'open',
  'paused',
  'closed',
]);

export const exchangeFulfillmentMethodEnum = pgEnum(
  'exchange_fulfillment_method',
  ['shipping', 'meetup', 'either'],
);

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
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    status: entityStatusEnum('status').notNull().default('draft'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('goods_sku_code_unique').on(table.skuCode),
    uniqueIndex('goods_slug_unique').on(table.slug),
    index('goods_series_id_idx').on(table.seriesId),
    index('goods_goods_type_idx').on(table.goodsType),
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
    note: text('note'),
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
    index('exchange_listings_moderation_status_idx').on(table.moderationStatus),
    index('exchange_listings_fulfillment_method_idx').on(
      table.fulfillmentMethod,
    ),
    check(
      'exchange_listings_description_not_empty_check',
      sql`char_length(trim(${table.description})) > 0`,
    ),
    check(
      'exchange_listings_goods_pair_check',
      sql`${table.wantedGoodsId} is null or ${table.wantedGoodsId} <> ${table.goodsId}`,
    ),
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

export type Ip = typeof ips.$inferSelect;
export type Character = typeof characters.$inferSelect;
export type Series = typeof series.$inferSelect;
export type Good = typeof goods.$inferSelect;
export type GoodImage = typeof goodsImages.$inferSelect;
export type GoodImageEmbedding = typeof goodsImageEmbeddings.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type UserGood = typeof userGoods.$inferSelect;
export type CatalogSubmission = typeof catalogSubmissions.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostImage = typeof postImages.$inferSelect;
export type Rating = typeof ratings.$inferSelect;
export type ExchangeListing = typeof exchangeListings.$inferSelect;
