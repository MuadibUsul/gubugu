# 谷布谷技术架构与项目路径

> 扫描基准：2026-08-22，工作区 `E:\Codes\gubugu`。本文记录当前代码真实状态，不描述尚未实现的产品设想。文件名按用户指定保留为 `strugle.md`。

## 1. 项目定位

谷布谷是一个 PC 优先、移动 Web 响应式的谷子图鉴与收藏协作平台。核心实体是 SKU（数据库表 `goods`），围绕 SKU 提供：

- IP、角色、系列、SKU 四级图鉴；
- 搜索、标签与属性筛选；
- `owned`、`wanted`、`exchange` 收藏状态；`owned + lit_at` 区分入柜与扫描点亮；
- 收藏数量、可换数量、超想要与完成度；
- 评论、评分、晒图、关注、Feed、角色收藏圈；
- 双向匹配、三方循环、公开换谷帖、正式报价、最多三次反提、无资金换谷履约、评价与信誉；
- 一对一私信、未读通知、举报与拉黑；
- 图片识别候选；
- SKU 高清分享谷卡、下载、系统分享与社交链接预览；
- 图鉴管理、内容审核和举报处理；
- 面向未来薄客户端的认证 JSON API。

产品明确不是人民币 C2C 市场。旧定价市场表和迁移仅为历史兼容保留，运行时入口已经删除；`0018`–`0019` 只重新启用不含现金的换谷帖、报价修订与私信协作。

## 2. 技术栈

| 层级       | 当前实现                                                    |
| ---------- | ----------------------------------------------------------- |
| Web 框架   | Next.js 16 App Router、React 19、Server Components          |
| 语言       | TypeScript 5.9，`strict: true`                              |
| 样式       | Tailwind CSS 4、少量 shadcn/ui 基础组件、全局设计 token     |
| 数据库     | PostgreSQL、`pg` 连接池                                     |
| ORM / 迁移 | Drizzle ORM、Drizzle Kit，迁移 `0000`–`0021`                |
| 边界校验   | Zod 4                                                       |
| 认证       | 生产 Supabase Auth；本地 PostgreSQL 密码账号 + 签名 Cookie  |
| 文件存储   | Supabase Storage；本地种子图使用生成目录                    |
| 图片识别   | Transformers.js + CLIP 图像向量、JSONB 向量存储、余弦相似度 |
| 测试       | Vitest，共 30 个 `*.test.ts` 文件                           |
| 质量工具   | ESLint、Prettier、TypeScript、Drizzle Check、RLS 验证脚本   |
| 包管理     | pnpm                                                        |

仓库当前约有 49 个 `app/` 文件、45 个组件文件、48 个 `lib/` 文件、53 个 `server/` 文件和 46 个 `drizzle/` 文件。

## 3. 总体架构

项目采用单仓库、单进程、模块化单体。没有微服务、消息队列、全局客户端状态库或重复业务后端。

```text
浏览器 / 未来薄客户端
        │
        ├── Next.js Server Components ── 页面读取
        ├── Next.js Server Actions ───── Web 写操作
        └── /api/v1 Route Handlers ───── JSON 读取接口
                         │
                         ▼
              server/auth + Zod 边界校验
                         │
             ┌───────────┴───────────┐
             ▼                       ▼
     server/data 仓储查询       lib 纯领域逻辑
             │               匹配 / 状态机 / 评分
             └───────────┬───────────┘
                         ▼
                Drizzle ORM + pg Pool
                         │
                         ▼
                    PostgreSQL

图片识别旁路：相机/上传 → CLIP 向量 → SKU 候选 → 服务端 attempt → 相机候选确认点亮
认证旁路：Supabase Auth（生产）/ PostgreSQL 账号 + 签名 Cookie（本地）
图片旁路：Supabase Storage（社区图）/ 本地样例图（开发种子）
```

### 3.1 分层职责

| 路径                  | 职责                                                       | 约束                                                                  |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `app/`                | URL 路由、RSC 页面、Route Handler、loading/error/not-found | 页面只编排数据和渲染，不直接承载领域规则                              |
| `components/`         | 页面区块、交互组件、UI 原语                                | 默认服务端组件，仅浏览器 API、表单状态和局部交互使用 Client Component |
| `server/*/actions.ts` | 写操作、鉴权、Zod 校验、事务、缓存失效                     | 所有业务写入从这里进入                                                |
| `server/data/`        | Drizzle 查询和视图模型装配                                 | `server-only`，不进入客户端 bundle                                    |
| `lib/`                | 纯函数、schema、配置、领域状态机                           | 尽量无数据库依赖，可直接单测                                          |
| `drizzle/schema/`     | PostgreSQL schema 和关系                                   | 所有 schema 变化必须配迁移                                            |
| `drizzle/migrations/` | 线性数据库历史                                             | 已执行迁移不可回写                                                    |
| `drizzle/seed/`       | 幂等演示数据和三账号验收关系                               | 不用于生产数据导入                                                    |
| `docs/`               | 产品、部署、识别和设计文档                                 | 部分历史文档可能早于当前精简结果，本文作为当前架构索引                |

### 3.2 读写路径

读取路径：

```text
page.tsx / route.ts
  → server/auth（按需）
  → server/data/*
  → server/db/client.ts
  → Drizzle
  → PostgreSQL
  → 视图模型
  → RSC HTML 或 API envelope
```

写入路径：

```text
Client Form / Server Form
  → Server Action
  → Zod 解析
  → requireAuthUser / requireAdminAccess
  → 服务端重新查询资格和当前状态
  → 纯领域规则校验
  → Drizzle transaction / 条件 UPDATE
  → revalidatePath / updateTag
```

客户端不能直接提交可信的数量、匹配结果、换谷状态、评价归属或管理员权限。服务端会重新读取数据库并计算。

### 3.3 Server Components 与 Client Components

全站默认使用 Server Components。目前 Client Components 仅用于：

- 登录表单和 Server Action 状态；
- 商品收藏、评分、评论上传；
- 搜索筛选和卡片快捷操作；
- 图片拍摄、上传和识别结果交互；
- 后台编辑表单；
- 错误边界。

没有 Redux、Zustand 或其他全局客户端状态库。

## 4. 核心领域

### 4.1 图鉴与搜索

- 层级：`ips → series → goods`，角色通过 `characters` 与 `goods_characters` 关联。
- SKU 是评论、图片、评分、收藏、匹配、换谷快照和蹲谷通知的核心关联实体。
- `server/data/catalog.ts` 和 `catalog-browser.ts` 装配详情与浏览视图。
- `server/data/search-service.ts` 负责搜索输入、过滤项、分页和数据库查询。
- 图鉴读取使用 `unstable_cache`，默认 300 秒兜底；后台修改通过 cache tag 和 path revalidation 主动失效。

### 4.2 收藏、成就与个人资料

- `user_goods` 以 `(user_id, goods_id, status)` 表达同一 SKU 的多状态关系。
- `owned` 表示 SKU 已入谷柜；只有 `owned.lit_at IS NOT NULL` 才表示经相机识别确认的已点亮收藏。
- `quantity`、`tradable_quantity`、`wishlist_priority` 由服务端校验。
- 完成度、成就、角色圈、匹配和换谷资格只统计已点亮收藏；普通收藏不会伪造真实持有。
- 已点亮收藏变更会重新计算成就，并在新增可换供给时通知对应 SKU 的蹲谷用户。
- 个人资料支持 `public / followers / private`；公开主页读取前在服务端执行可见性判断。

### 4.3 匹配与换谷

匹配源只有 `user_goods`：

```text
OFFER(user, sku) = status=exchange 且 tradable_quantity > 0
WANT(user, sku)  = status=wanted
```

- `lib/matching/graph.ts`：纯函数计算互惠匹配和三方循环。
- `lib/matching/score.ts`：按愿望覆盖、交换平衡、互惠深度计算 0–100 分。
- `server/data/matching.ts`：只加载当前用户的两跳换谷邻域，覆盖双向与 A→B→C→A，并批量水合 SKU 和用户摘要。
- `server/data/trade.ts` 与 `server/trade/actions.ts`：公开换谷帖、报价、反提、接受与拒绝的唯一读取/写入边界。
- 发布者策略为 `wishlist_only`（每个对方提供 SKU 都必须在愿望单）或 `open_to_offers`（愿望单优先，也可接受其他真实可换 SKU）。
- 初始出价是 revision 0，不计议价；整条双方协商链最多 3 次反提。修订不可变，不能靠拒绝后重开绕过次数限制。
- 接受报价时在同一事务内重验策略、回合、双方真实库存，并按固定锁序预留 SKU 与数量；并发重复接受会失败。
- `server/exchanges/actions.ts`：负责接受后的取消、双方独立寄出/收货、原子库存结算、评价与通知。
- `server/trade/inventory.ts`：集中处理库存行锁、预留、恢复和完成结算；出让物会同时从可换与已拥有数量扣除。
- `lib/exchange/status.ts`：状态机 `draft → proposed → accepted → shipping → received → completed`，另有不可逆 `cancelled`。
- `lib/exchange/progress.ts`：双方独立确认寄出和收货，双方都完成后推进终态。
- 取消只允许在任何一方尚未寄出前发生。
- 完成后双方分别评价，`server/data/reputation.ts` 聚合用户信誉。
- 三方循环只生成协调提案，不实现复杂多边物流。

### 4.4 社交、安全与通知

- 关注关系：`follows`；计数和列表在 `server/data/follows.ts`。
- Feed：只读取关注对象审核通过的公开帖子，支持分页。
- 角色收藏圈：从 SKU 收藏关系派生公开成员列表，不新增群聊。
- 私信：`direct_conversations` 每对用户唯一，`direct_messages` 仅参与者可读；个人资料可见性、拉黑和交易上下文都由服务端校验。聊天不替代正式报价修订。
- 举报：支持帖子、换谷帖、换谷单和私信；管理员在统一审核页看到必要证据并处理。
- 通知：换谷、报价、私信、举报处理、蹲谷等使用站内 `notifications` 表，私信通知不复制正文。
- 限流：`lib/rate-limit.ts` 是单进程固定窗口限流器，保护写入口和识别接口。

### 4.5 图片识别

识别是候选辅助，不承诺自动确定 SKU：

1. `/recognition` 需要登录；浏览器完成相机权限、取景框、拍摄或文件上传。
2. `POST /api/recognition/candidates` 再次校验登录、频率、multipart、JPG/PNG/WebP MIME 和 10 MB 上限。
3. `server/recognition/embedding.ts` 使用 `Xenova/clip-vit-base-patch32` 生成 512 维向量。
4. `server/data/recognition-search.ts` 从 JSONB 读取已就绪向量并在 Node 进程中计算余弦相似度。
5. 每个 SKU 只保留最佳图片，返回最多 5 个候选，并创建 15 分钟有效的服务端 `recognition_attempts`。
6. 只有 `camera + embedding-search` attempt 保存可确认候选；上传和 Mock 结果只能查看详情。
7. 确认只提交 `requestId + candidateId`；服务端 `FOR UPDATE` 锁 attempt、校验用户/来源/过期时间并写入 `lit_at`。
8. 没有向量索引或数据库不可用时，返回明确标记的占位候选，不伪装成真实识别或允许点亮。

`pnpm db:embed` 是离线图鉴图片建索引任务。模型首次冷加载约 140 秒，因此当前部署目标是常驻 Node 进程，不适合每次请求都冷启动的 serverless 形态。

### 4.6 管理后台

- `moderator`：进入 `/admin` 和 `/admin/moderation`，处理投稿、图片、评论和举报。
- `admin`：额外进入 `/admin/catalog` 和 `/admin/goods`，维护 IP、角色、系列、SKU、标签与图片。
- 生产角色来自用户 ID / 邮箱环境变量 allowlist。
- 本地无 Supabase 时，三账号分别映射为 admin、普通用户、moderator。

## 5. 认证、安全与数据边界

### 5.1 认证模式

| 环境 | 认证实现                                                                             |
| ---- | ------------------------------------------------------------------------------------ |
| 生产 | Supabase Auth；`proxy.ts` 刷新 session，`server/auth/session.ts` 调用 `getUser()`    |
| 本地 | `local_auth_accounts` + scrypt 密码哈希；`gubugu-local-session` 签名 HttpOnly Cookie |

`instrumentation.ts` 在 Node 运行时加载 `server/env.ts`。生产缺少 `DATABASE_URL` 或完整 Supabase URL/anon key 时直接拒绝启动；本地认证另要求至少 32 位 `LOCAL_AUTH_SECRET`。

### 5.2 授权

- `/me/*`、`/matches/*`、`/recognition` 使用 `requireAuthUser()`。
- `/admin` 和审核页使用 `requireModeratorAccess()`。
- 图鉴、SKU 管理使用 `requireAdminAccess()`。
- 用户主页在数据进入 RSC payload 前执行资料可见性判断。
- 换谷帖按发布者控制，报价、换谷单和私信按参与者限制读取和写入；应用层 SQL 条件不依赖 owner 会绕过的 RLS。
- API v1 使用 `requireApiUser()`，匿名返回统一 401 envelope。

### 5.3 RLS 的真实作用

数据库已经有 RLS 策略并由 `pnpm db:verify-rls` 验证，但当前 Next.js 运行时通过表 owner 的 `DATABASE_URL` 连接，owner 默认绕过 RLS。因此当前请求安全的主防线是 `server/` 应用层鉴权，不应把 RLS 当作运行时唯一保护。RLS 主要为未来 Supabase Data API / 薄客户端边界预留。

### 5.4 数据库与连接池

`server/db/client.ts` 在 `globalThis` 中缓存唯一的 Drizzle + `pg.Pool` 上下文，开发 HMR 和生产请求都复用连接池，避免每次查询泄漏新连接。

## 6. 数据模型

### 6.1 当前活跃表

| 分类       | 表                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 图鉴       | `ips`, `characters`, `series`, `goods`                                                                                        |
| 图鉴关系   | `goods_images`, `goods_image_embeddings`, `tags`, `goods_tags`, `goods_characters`                                            |
| 用户       | `profiles`, `follows`, `user_goods`, `recognition_attempts`                                                                   |
| 社区       | `catalog_submissions`, `posts`, `post_images`, `ratings`                                                                      |
| 换谷       | `exchange_listings`, `exchange_offers`, `exchange_offer_revisions`, `exchanges`, `exchange_reviews`, `coordination_proposals` |
| 私信       | `direct_conversations`, `direct_messages`, `user_blocks`                                                                      |
| 安全与通知 | `notifications`, `reports`, `goods_watches`                                                                                   |
| 成就       | `achievements`, `user_achievements`                                                                                           |

### 6.2 历史兼容表

`listings`, `listing_photos`, `want_orders`, `orders`, `payments`, `market_transactions` 仅为历史兼容保留且没有用户运行时入口。`exchange_listings` 已被明确复用为无现金换谷帖，数据库约束永久禁止 `allow_cash=true`。

## 7. URL 路由图

### 7.1 页面路由

| URL                                               | 权限         | 作用                                   |
| ------------------------------------------------- | ------------ | -------------------------------------- |
| `/`                                               | 公开         | 首页、作品入口、最近 SKU、搜索入口     |
| `/search`                                         | 公开         | 公共谷库、SKU 搜索、标签和属性筛选     |
| `/ips/[ipSlug]`                                   | 公开         | IP 图鉴                                |
| `/ips/[ipSlug]/characters/[characterSlug]`        | 公开         | 角色图鉴、完成度                       |
| `/ips/[ipSlug]/characters/[characterSlug]/circle` | 公开读取     | 角色收藏圈和成员分页                   |
| `/ips/[ipSlug]/series/[seriesSlug]`               | 公开         | 系列图鉴                               |
| `/goods/[goodsSlug]`                              | 公开读取     | SKU 规格、图片、收藏、社区与分享谷卡   |
| `/users/[handle]`                                 | 按资料可见性 | 用户收藏主页、关注、信誉               |
| `/login`                                          | 公开         | Supabase 登录或本地邮箱注册/密码登录   |
| `/matches`                                        | 登录         | 换谷广场、匹配和我的协商工作台         |
| `/matches/new`                                    | 登录         | 发布无现金换谷帖                       |
| `/matches/[listingId]`                            | 登录         | 换谷帖详情、出价与发布者管理           |
| `/matches/offers/[offerId]`                       | 报价参与者   | 条款历史、最多三次反提、接受/拒绝/撤回 |
| `/recognition`                                    | 登录         | 相机扫描点亮；上传仅用于候选查询       |
| `/me`                                             | 登录         | 个人中心、关注/粉丝列表                |
| `/me/collection`                                  | 登录         | 收藏册、完成度、成就                   |
| `/me/exchanges`                                   | 登录         | 双方换谷单、评价、三方协调提案         |
| `/me/messages`                                    | 登录         | 私信收件箱                             |
| `/me/messages/[conversationId]`                   | 会话参与者   | 私信线程、交易上下文、举报与拉黑       |
| `/me/feed`                                        | 登录         | 关注动态分页                           |
| `/me/notifications`                               | 登录         | 站内通知与已读操作                     |
| `/me/profile`                                     | 登录         | 展示名、简介、城市、资料可见性         |
| `/admin`                                          | moderator    | 后台总览                               |
| `/admin/moderation`                               | moderator    | 投稿、图片、评论和举报统一处理队列     |
| `/admin/catalog`                                  | admin        | IP、角色、系列维护                     |
| `/admin/goods`                                    | admin        | SKU、标签和官图维护                    |

### 7.2 Route Handlers

| URL                           | 方法 / 权限 | 作用                             |
| ----------------------------- | ----------- | -------------------------------- |
| `/auth/callback`              | GET         | Supabase OAuth / magic-link 回调 |
| `/api/recognition/candidates` | POST / 登录 | 图片上传与候选识别               |
| `/api/v1/collection`          | GET / 登录  | 收藏状态读取                     |
| `/api/v1/matches`             | GET / 登录  | 匹配结果读取                     |
| `/api/v1/exchanges`           | GET / 登录  | 换谷单读取                       |
| `/api/v1/notifications`       | GET / 登录  | 通知读取                         |
| `/demo-assets/[...asset]`     | GET         | 本地演示 SVG 资产生成            |
| `/goods/[goodsSlug]/share`    | GET / 公开  | 生成 1080 × 1440 PNG 分享谷卡    |

API v1 envelope 固定为：

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

当前 API v1 只提供读取；Web 写操作统一走 Server Actions，二者复用相同的 `server/data` 和 `lib` 领域逻辑。

## 8. 完整项目路径

以下列出业务源码、数据库和运维文档。省略 `node_modules/`、`.next/`、Git 元数据、模型缓存、原始图片逐文件名和 `public/local-sample-images/` 生成图片。

```text
E:\Codes\gubugu
├─ AGENTS.md
├─ README.md
├─ plan.md
├─ strugle.md
├─ package.json
├─ pnpm-lock.yaml
├─ tsconfig.json
├─ next.config.ts
├─ drizzle.config.ts
├─ eslint.config.mjs
├─ prettier.config.mjs
├─ postcss.config.mjs
├─ vitest.config.ts
├─ components.json
├─ .env.example
├─ proxy.ts
├─ instrumentation.ts
│
├─ app
│  ├─ layout.tsx
│  ├─ page.tsx
│  ├─ globals.css
│  ├─ icon.svg
│  ├─ loading.tsx
│  ├─ error.tsx
│  ├─ not-found.tsx
│  ├─ forbidden.tsx
│  ├─ login/page.tsx
│  ├─ search/{page.tsx,loading.tsx,error.tsx}
│  ├─ recognition/page.tsx
│  ├─ matches
│  │  ├─ page.tsx
│  │  ├─ new/page.tsx
│  │  ├─ [listingId]/page.tsx
│  │  └─ offers/[offerId]/page.tsx
│  ├─ goods/[goodsSlug]
│  │  ├─ {page.tsx,loading.tsx,error.tsx,not-found.tsx}
│  │  └─ share/route.tsx
│  ├─ users/[handle]/{page.tsx,loading.tsx,error.tsx,not-found.tsx}
│  ├─ ips
│  │  └─ [ipSlug]
│  │     ├─ page.tsx
│  │     ├─ series/[seriesSlug]/page.tsx
│  │     └─ characters/[characterSlug]
│  │        ├─ page.tsx
│  │        ├─ loading.tsx
│  │        ├─ error.tsx
│  │        ├─ not-found.tsx
│  │        └─ circle/page.tsx
│  ├─ me
│  │  ├─ page.tsx
│  │  ├─ collection/page.tsx
│  │  ├─ exchanges/page.tsx
│  │  ├─ messages/page.tsx
│  │  ├─ messages/[conversationId]/page.tsx
│  │  ├─ feed/page.tsx
│  │  ├─ notifications/page.tsx
│  │  └─ profile/page.tsx
│  ├─ admin
│  │  ├─ page.tsx
│  │  ├─ loading.tsx
│  │  ├─ error.tsx
│  │  ├─ catalog/page.tsx
│  │  ├─ goods/page.tsx
│  │  └─ moderation/page.tsx
│  ├─ auth/callback/route.ts
│  ├─ demo-assets/[...asset]/route.ts
│  └─ api
│     ├─ recognition/candidates/route.ts
│     └─ v1
│        ├─ _shared.ts
│        ├─ collection/route.ts
│        ├─ exchanges/route.ts
│        ├─ matches/route.ts
│        └─ notifications/route.ts
│
├─ components
│  ├─ admin
│  │  ├─ admin-shell.tsx
│  │  ├─ moderation-shell.tsx
│  │  ├─ admin-catalog-management-shell.tsx
│  │  ├─ admin-catalog-editor-form.tsx
│  │  ├─ admin-goods-management-shell.tsx
│  │  └─ admin-goods-editor-form.tsx
│  ├─ auth/login-form.tsx
│  ├─ character
│  │  ├─ character-query.ts
│  │  ├─ character-sheet.tsx
│  │  ├─ character-sheet-filters.tsx
│  │  └─ character-sheet-header.tsx
│  ├─ collection/{record-slips.tsx,slot-strip.tsx}
│  ├─ exchange
│  │  ├─ trade-listing-card.tsx
│  │  ├─ trade-listing-form.tsx
│  │  ├─ trade-offer-form.tsx
│  │  └─ trade-offer-panel.tsx
│  ├─ messages
│  │  ├─ message-inbox.tsx
│  │  ├─ message-thread.tsx
│  │  └─ message-scroll-anchor.tsx
│  ├─ goods
│  │  ├─ goods-card-art.tsx
│  │  ├─ goods-gallery.tsx
│  │  ├─ goods-spec-table.tsx
│  │  ├─ goods-status-actions.tsx
│  │  ├─ goods-share-card.tsx
│  │  ├─ goods-community-panel.tsx
│  │  ├─ goods-community-composer.tsx
│  │  └─ goods-rating-composer.tsx
│  ├─ home
│  │  ├─ home-frontispiece.tsx
│  │  ├─ home-primary-search.tsx
│  │  ├─ home-contents.tsx
│  │  ├─ home-accessions.tsx
│  │  └─ home-index.tsx
│  ├─ layout/{site-navigation.tsx,site-nav-links.tsx,page-notice.tsx}
│  ├─ recognition
│  │  ├─ recognition-shell.tsx
│  │  ├─ recognition-candidate-card.tsx
│  │  └─ recognition-candidates-panel.tsx
│  ├─ safety/report-form.tsx
│  ├─ search
│  │  ├─ search-query.ts
│  │  ├─ search-panel-state.tsx
│  │  ├─ search-filters.tsx
│  │  ├─ search-results.tsx
│  │  ├─ search-result-card.tsx
│  │  └─ search-card-actions.tsx
│  ├─ ui/{button.tsx,remote-image.tsx}
│  └─ user
│     ├─ follow-button.tsx
│     ├─ user-achievement-ledger.tsx
│     ├─ user-collection-header.tsx
│     ├─ user-collection-sheet.tsx
│     └─ user-photo-strip.tsx
│
├─ lib
│  ├─ achievements.ts
│  ├─ admin-access.ts
│  ├─ admin-catalog.ts
│  ├─ admin-goods.ts
│  ├─ cache-tags.ts
│  ├─ css-url.ts
│  ├─ demo-assets.ts
│  ├─ exchange/{fulfillment.ts,negotiation.ts,progress.ts,status.ts}
│  ├─ messages.ts
│  ├─ formatters.ts
│  ├─ goods-image.ts
│  ├─ goods-rating.ts
│  ├─ moderation.ts
│  ├─ rate-limit.ts
│  ├─ recognition.ts
│  ├─ search-params.ts
│  ├─ slug.ts
│  ├─ user-goods-status.ts
│  ├─ utils.ts
│  ├─ vector-similarity.ts
│  ├─ api/envelope.ts
│  ├─ auth/local-demo.ts
│  ├─ config/{site.ts,demo-viewers.ts}
│  ├─ integrations/contracts.ts
│  ├─ matching/{graph.ts,score.ts}
│  └─ supabase/{config.ts,middleware.ts,server.ts,storage.ts}
│
├─ server
│  ├─ env.ts
│  ├─ db/client.ts
│  ├─ auth
│  │  ├─ types.ts
│  │  ├─ session.ts
│  │  ├─ local-session.ts
│  │  ├─ admin.ts
│  │  ├─ actions.ts
│  │  └─ action-state.ts
│  ├─ admin
│  │  ├─ catalog/{actions.ts,action-state.ts}
│  │  ├─ goods/{actions.ts,action-state.ts}
│  │  ├─ moderation/actions.ts
│  │  └─ reports/actions.ts
│  ├─ community/{actions.ts,action-state.ts}
│  ├─ exchanges/actions.ts
│  ├─ messages/{access.ts,actions.ts}
│  ├─ trade/{actions.ts,inventory.ts}
│  ├─ follow/actions.ts
│  ├─ notifications/{actions.ts,watch.ts}
│  ├─ profile/actions.ts
│  ├─ social/actions.ts
│  ├─ user-goods/actions.ts
│  ├─ recognition/{service.ts,embedding.ts,mock.ts}
│  └─ data
│     ├─ index.ts
│     ├─ _shared.ts
│     ├─ catalog.ts
│     ├─ catalog-browser.ts
│     ├─ goods-detail.ts
│     ├─ search-service.ts
│     ├─ user-goods.ts
│     ├─ user-profile.ts
│     ├─ community.ts
│     ├─ achievements.ts
│     ├─ profiles.ts
│     ├─ follows.ts
│     ├─ feed.ts
│     ├─ character-circle.ts
│     ├─ matching.ts
│     ├─ trade.ts
│     ├─ messages.ts
│     ├─ exchanges.ts
│     ├─ reputation.ts
│     ├─ notifications.ts
│     ├─ moderation.ts
│     ├─ recognition-search.ts
│     ├─ admin-dashboard.ts
│     ├─ admin-catalog.ts
│     └─ admin-goods.ts
│
├─ drizzle
│  ├─ README.md
│  ├─ schema/index.ts
│  ├─ embed/index.ts
│  ├─ verify-rls.mjs
│  ├─ verify-trade.mjs
│  ├─ verify-lighting.mjs
│  ├─ seed
│  │  ├─ index.ts
│  │  ├─ data.ts
│  │  ├─ expanded-data.ts
│  │  ├─ profiles.ts
│  │  ├─ achievements.ts
│  │  ├─ matching.ts
│  │  └─ local-sample-images.ts
│  └─ migrations
│     ├─ 0000_initial_goods_encyclopedia.sql
│     ├─ 0001_fluffy_big_bertha.sql
│     ├─ 0002_fluffy_gamora.sql
│     ├─ 0003_fancy_shinko_yamashiro.sql
│     ├─ 0004_bizarre_dorian_gray.sql
│     ├─ 0005_silent_juggernaut.sql
│     ├─ 0006_unusual_kree.sql
│     ├─ 0007_nebulous_proteus.sql
│     ├─ 0008_guarded_row_level_security.sql
│     ├─ 0009_reflective_wallow.sql
│     ├─ 0010_marketplace_foundation.sql
│     ├─ 0011_salty_glorian.sql
│     ├─ 0012_smart_leader.sql
│     ├─ 0013_sudden_sleeper.sql
│     ├─ 0014_nosy_wither.sql
│     ├─ 0015_moaning_talisman.sql
│     ├─ 0016_close_legacy_surfaces.sql
│     ├─ 0017_furry_alex_power.sql
│     ├─ 0018_brave_harrier.sql
│     ├─ 0019_nebulous_thanos.sql
│     ├─ 0020_sudden_jazinda.sql
│     ├─ 0021_strict_lighting_transition.sql
│     └─ meta/{_journal.json,0000_snapshot.json ... 0021_snapshot.json}
│
├─ docs
│  ├─ architecture.md
│  ├─ deployment.md
│  ├─ design-site-snapshot.md
│  ├─ prd.md
│  ├─ recognition-options.md
│  ├─ schema.md
│  └─ ui-guidelines.md
│
├─ test/stubs/server-only.ts
├─ images/                         # 原始/导入样例图片
└─ public
   ├─ local-sample-images/         # seed 同步生成，不作为手写源码维护
   └─ fonts/                       # 分享卡中文字体与 OFL 许可证
```

测试文件与其被测模块相邻：

```text
lib/achievements.test.ts
lib/admin-access.test.ts
lib/api/envelope.test.ts
lib/css-url.test.ts
lib/exchange/progress.test.ts
lib/exchange/negotiation.test.ts
lib/exchange/status.test.ts
lib/formatters.test.ts
lib/goods-image.test.ts
lib/goods-rating.test.ts
lib/matching/graph.test.ts
lib/matching/score.test.ts
lib/messages.test.ts
lib/rate-limit.test.ts
lib/recognition.test.ts
lib/search-params.test.ts
lib/slug.test.ts
lib/user-goods-status.test.ts
lib/vector-similarity.test.ts
server/auth/admin.test.ts
server/data/search-pattern.test.ts
server/data/user-goods.test.ts
server/db/client.test.ts
server/env.test.ts
```

## 9. 本地运行与数据库

### 9.1 环境变量

最小本地数据库配置：

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/gubugu"
```

不配置 Supabase 时启用本地 PostgreSQL 注册与密码登录，并要配置 `LOCAL_AUTH_SECRET`。生产必须配置：

```env
DATABASE_URL="..."
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
APP_URL="https://your-public-domain.example"
ADMIN_USER_EMAILS="..."
```

可选管理员和审核员变量：`ADMIN_USER_IDS`、`MODERATOR_USER_EMAILS`、`MODERATOR_USER_IDS`。

### 9.2 常用命令

```bash
pnpm install
pnpm dev                 # 只监听 127.0.0.1
pnpm build
pnpm start

pnpm db:migrate
pnpm db:seed
pnpm db:embed
pnpm db:verify-rls
pnpm db:verify-trade
pnpm db:verify-lighting
pnpm db:studio

pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
```

建议首次本地启动顺序：

```text
启动 PostgreSQL
  → 配置 .env.local
  → pnpm install
  → pnpm db:migrate
  → pnpm db:seed
  → pnpm dev
```

## 10. 当前架构边界与已知风险

1. **RLS 不是当前请求主防线**：应用数据库连接以 owner 运行，权限必须继续在 Server Action / data access 层显式检查。
2. **匹配图在两跳邻域内计算**：已经避免全表关系加载；若单个热门 SKU 的邻域超过保护上限，再考虑异步预计算，而不是提前拆微服务。
3. **识别向量是 JSONB 全量排序**：适合当前图鉴规模；规模扩大后再迁移 pgvector + ANN 索引。
4. **识别模型冷启动重**：需要常驻 Node 进程；`instrumentation.ts` 目前只校验环境，没有自动预热模型。
5. **限流是单进程内存实现**：多实例部署时各实例互不共享，届时需要 Redis 等共享限流。
6. **社区图片依赖 public Supabase bucket**：当前用 `getPublicUrl()`，若改私有桶必须增加签名 URL 流程。
7. **本地会话不做服务端撤销列表**：退出会删除 Cookie，但已泄露的签名 Cookie 在 14 天内仍可重放；生产使用 Supabase 会话管理。
8. **历史市场 schema 仍在**：这是迁移兼容选择，不代表产品仍支持人民币交易；不要重新暴露旧入口。
9. **没有 Dockerfile 和正式 CI 配置**：当前验证依赖本地命令；容器化时还需 `output: 'standalone'`、模型缓存和进程守护方案。
10. **P2 只保留接口**：Push、物流、鉴定、订阅、推荐位于 `lib/integrations/contracts.ts`，没有外部实现或配置读取。
11. **扫描不是防伪鉴定**：Web 不能证明镜头一定面对真实实物，也不能阻止翻拍屏幕；当前边界只保证点亮必须经过服务端真实向量候选和一次性 attempt。
12. **缩略图灰阶不是内容保护**：灰度由界面样式表达收藏激励，公开图片 URL 仍可被浏览器访问；它不是 DRM 或防下载方案。

## 11. 维护原则

- 新用户交互应最终解析到 SKU；不要创建与 SKU 脱离的收藏或换谷模型。
- 页面读取放 `server/data`，写操作放对应领域 `actions.ts`，纯规则放 `lib`。
- 所有外部输入使用 Zod；权限、资格和状态转换只相信服务端数据库状态。
- schema 变化只通过新迁移推进，种子保持可重复执行。
- 优先扩展现有模块，不为单一实现增加 factory、service interface 或全局状态库。
- 不恢复人民币支付、钱包、托管、仲裁、重社交 Feed 或自训练视觉模型。
