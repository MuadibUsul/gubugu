# Schema Overview

## Purpose

This document defines the core V1 data model direction for Gooods Dex.

The schema should support:

- encyclopedia browsing
- strong search and filtering
- SKU-level user collection state
- comments, ratings, and user-uploaded photos
- lightweight exchange intent
- camera entry with candidate matching hooks

The schema should remain maintainable for long-term solo development.

## Core Hierarchy

The product hierarchy is:

`IP -> Character -> Series -> Goods SKU`

This is the primary encyclopedia path for V1.

Important:

- SKU is the core entity
- user actions should resolve to SKU whenever possible
- upper-level entities exist to organize discovery, navigation, and context around SKU

## Core Entities

### IP

Represents the top-level franchise or intellectual property.

Typical responsibilities:

- top-level encyclopedia grouping
- search and browse entry point
- parent context for characters and series

Typical fields:

- `id`
- `slug`
- `name`
- `name_localized`
- `description`
- `cover_image_url`
- `status`
- `created_at`
- `updated_at`

### Character

Represents a collectible-relevant character under an IP.

Typical responsibilities:

- character encyclopedia page
- character-based search and filtering
- immersive context for related SKUs

Typical fields:

- `id`
- `ip_id`
- `slug`
- `name`
- `name_localized`
- `description`
- `avatar_image_url`
- `created_at`
- `updated_at`

### Series

Represents a merchandise line, release wave, event run, collaboration set, or themed collection under an IP.

Typical responsibilities:

- group related SKUs
- expose completion progress
- support series-based browse and filter flows

Typical fields:

- `id`
- `ip_id`
- `slug`
- `name`
- `series_type`
- `release_date`
- `description`
- `cover_image_url`
- `created_at`
- `updated_at`

### Goods SKU

Represents the lowest-level collectible record and the core entity of the platform.

Typical responsibilities:

- detail page target
- collection state target
- rating, comment, photo, and exchange target
- candidate matching confirmation target

Typical fields:

- `id`
- `series_id`
- `sku_code`
- `slug`
- `name`
- `goods_type`
- `material`
- `scale_or_size`
- `edition`
- `release_date`
- `msrp_amount`
- `currency`
- `cover_image_url`
- `gallery`
- `rarity_note`
- `metadata_json`
- `created_at`
- `updated_at`

### Goods Images

Represents the authoritative catalog image set for a SKU.

Typical responsibilities:

- official gallery for goods detail pages
- source image set for future similarity indexing
- primary image source for search cards and recognition candidates

Typical fields:

- `id`
- `goods_id`
- `image_url`
- `alt_text`
- `sort_order`
- `is_primary`
- `created_at`
- `updated_at`

### Goods Image Embeddings

Represents future-ready similarity index records derived from `goods_images`.

Important:

- keep this separate from `goods_images`
- `goods_images` remains the authoritative catalog asset record
- `goods_image_embeddings` stores model-specific indexing metadata and embedding payload
- one goods image may have multiple embedding rows across different providers or models

Typical fields:

- `id`
- `goods_image_id`
- `status`
- `provider`
- `model`
- `model_version`
- `dimensions`
- `source_checksum`
- `embedding_payload`
- `indexed_at`
- `last_error`
- `created_at`
- `updated_at`

## Relationship Guidance

Recommended V1 relationships:

- one `ip` has many `characters`
- one `ip` has many `series`
- one `series` has many `goods_skus`
- one `character` can relate to many `goods_skus`

Important modeling note:

- although the hierarchy reads `IP -> Character -> Series -> Goods SKU`, real merchandise data may require some flexibility
- if a SKU can involve multiple characters, prefer an explicit join table instead of flattening multi-character data into text fields

Recommended join table:

- `goods_sku_characters`

Purpose:

- link one SKU to one or more characters
- keep search and filtering structured
- preserve future extensibility for duo or group goods

## User-State Layer

V1 user collection state is centered on SKU.

Recommended table:

- `user_sku_states`

Core fields:

- `id`
- `user_id`
- `goods_sku_id`
- `state`
- `created_at`
- `updated_at`

Allowed state values:

- `owned`
- `wanted`
- `exchange`

Constraint guidance:

- enforce uniqueness on `user_id + goods_sku_id + state` if multiple states can coexist
- if the product later decides state should be mutually exclusive, change the rule intentionally instead of relying on UI assumptions

## Community Layer

### Ratings

Recommended table:

- `sku_ratings`

Purpose:

- store per-user rating for a SKU
- aggregate average rating and rating count in queries or materialized strategy later

### Comments

Recommended table:

- `sku_comments`

Purpose:

- lightweight discussion under a SKU
- no heavy feed behavior in V1

### User Photos

Recommended table:

- `sku_user_photos`

Purpose:

- support collection showing and real-world item reference
- attach moderation status when admin tools are added

## Exchange Layer

V1 exchange is lightweight intent, not transaction infrastructure.

Recommended table:

- `exchange_listings`

Purpose:

- allow a user to mark that a SKU is available or desired for exchange
- attach optional note, condition, location hint, and status

Do not model:

- payment
- escrow
- deposit
- settlement
- arbitration

## Admin and Data Quality Layer

V1 requires basic admin capabilities to maintain encyclopedia quality.

Suggested management concerns:

- structured create/update of IP, character, series, and SKU data
- moderation state for comments and photos
- visibility and publish status fields where needed

Admin support does not require a separate business domain. It should operate on the same normalized core data.

## Camera Entry Boundary

相机链路是一条录入工作流，不是模型平台。实际落地的表是下面两张——早期文档里提过的
`recognition_submissions` / `recognition_candidates` 从未实现，不要按那个名字找。

### recognition_attempts

一次服务端识别的权威记录，也是「不能伪造点亮」这条不变式的载体。

| 列                       | 用途                                             |
| ------------------------ | ------------------------------------------------ |
| `user_id`                | 发起识别的用户                                   |
| `source`                 | 来源，只有 `camera` 能点亮；普通上传与 mock 不能 |
| `provider`               | 识别提供方，当前为 `embedding-search`            |
| `candidate_map`          | 返回给浏览器的候选 id → 真实 SKU id 的映射       |
| `expires_at`             | 有效期，过期的确认请求一律拒绝                   |
| `confirmed_candidate_id` | 用户确认的候选                                   |
| `confirmed_goods_id`     | 服务端从 `candidate_map` 解析出的 SKU            |
| `confirmed_at`           | 确认时间，用于阻止重放                           |

确认接口只接受 `requestId + candidateId`：**SKU 必须由服务端解析，浏览器提交的 SKU
一律不可信**。这是整条链路的关键——否则任何人都能直接点亮任意 SKU。

### user_scans

未匹配到官方 SKU 的扫描，存为**私密未鉴定项**：进本人谷柜，不进公开主页，也不构成
换谷库存。

| 列                       | 用途                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `user_id`                | 所有者                                                         |
| `image_url`              | 私密资产键（内容哈希 + `.webp`）。列名是历史遗留，存的不是 URL |
| `recognition_attempt_id` | 关联的识别记录，便于日后重新匹配（唯一索引）                   |
| `top_score`              | 最接近的官方匹配分，0–100，有 CHECK 约束                       |
| `note`                   | 用户备注                                                       |
| `resolved_at`            | 后来从候选中确认了 SKU 的时间；确认后保留原图作识别审计        |

已启用 RLS，只有 `user_scans_self_read` 一条 SELECT 策略；**刻意不给写策略**，
`db:verify-rls` 断言客户端无法伪造扫描记录，写入只能走服务端领域层。

图片本身不在公开资产区，读取见 [deployment.md](deployment.md) 的资产边界一节。

识别按三档处理：高置信自动确认并点亮；中低置信展示有限候选由用户确认；无可靠候选则
落为未鉴定项。**不把相似度包装成真伪鉴定。**

## Recognition and Image-Index Mapping

To keep the current placeholder recognition flow compatible with future image embedding search, use this data flow:

1. `goods_images` stores the official image rows for each SKU
2. `goods_image_embeddings` stores provider/model-specific embedding metadata derived from one `goods_images` row
3. the recognition API returns ranked SKU candidates for the user
4. each candidate may optionally include similarity evidence that points back to the matched `goods_images.id`

Recommended candidate payload direction:

- `goods`: user-facing SKU summary
- `similarity.matched_goods_image_id`: the matched catalog image row when available
- `similarity.matched_image_url`: image preview used as evidence
- `similarity.score`: normalized score shown to UI
- `similarity.distance`: provider-native distance value if one exists
- `similarity.metric`: `cosine`, `dot_product`, or `l2`
- `similarity.embedding.*`: provider/model/version/status metadata

This allows the UI to keep showing SKU candidates while the backend gradually evolves from placeholder matching to true embedding-based retrieval.

## Migration Rules

- all schema changes must go through migrations
- keep schema definitions, generated migrations, and seed scripts organized under `drizzle/`
- keep seed scripts idempotent when practical
- use explicit foreign keys, indexes, and relation names
- never hardcode production data inside UI code

## V1 Modeling Priorities

When tradeoffs appear, prioritize in this order:

- SKU correctness
- searchability
- maintainable normalization
- admin maintainability
- future extensibility without overengineering
