# Gooods Dex

Gooods Dex is a web-first guzi encyclopedia platform for anime, game, and IP merchandise.

The project is built around four principles:

- encyclopedia data quality comes first
- search and filtering must be fast to understand and fast to use
- SKU is the core entity
- the product should feel like a premium collectible encyclopedia, not a generic admin table site

Mobile is the product's centre of gravity, with a desktop layout that uses the width rather than centring a phone column. Web, PWA and the Android Capacitor shell share one backend and one domain layer; the native shell stays thin.

## V1 Scope

V1 includes:

- IP / Character / Series / Goods SKU encyclopedia
- search and tag filtering
- user states: `owned`, `wanted`, `exchange`
- collection lighting and completion progress
- SKU detail pages
- comments
- user-uploaded photos
- ratings
- lightweight exchange intent
- basic admin capabilities
- camera-style recognition entry with candidate matching

V1 does not include:

- deposit workflows
- escrow
- payment settlement
- arbitration
- heavy social feed features
- complex voting seasons
- self-trained computer vision systems

The camera feature in V1 is an entry workflow. It should help users capture an item, upload it, and confirm from ranked candidates. It is not a heavy automatic CV platform.

## Product Positioning

Gooods Dex is designed for collectors who want a structured and visually rich way to browse, identify, and manage merchandise.

The platform should support:

- structured encyclopedia browsing across IP, character, series, and SKU
- immediate search-led discovery
- clear collection actions at SKU level
- lightweight community participation through comments, photos, and ratings
- lightweight exchange signaling without turning the product into a payment marketplace

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Drizzle ORM
- Zod
- pnpm
- ESLint
- Prettier

## Repository Structure

- `app/`: route tree, global layout, loading, error, and not-found states
- `components/`: reusable UI and layout primitives
- `lib/`: shared typed utilities and site configuration
- `server/`: server-only validation and future data-access modules
- `drizzle/`: schema, migrations, and seed workspace
- `docs/`: product, schema, UI, and architecture documentation
- `public/`: static assets
- `images/`: source images the seed copies into `public/local-sample-images`

## Local Setup

Install dependencies:

```bash
pnpm install
```

Start development:

```bash
pnpm dev
```

Validation commands:

```bash
pnpm lint
pnpm typecheck
pnpm format:check
pnpm format
```

Current note:

- `pnpm test` runs the Vitest suite over the pure logic in `lib/` and `server/`
- `pnpm db:verify-rls` checks the row level security policies against a real database, and needs `DATABASE_URL` plus a migrated and seeded schema

## Environment

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_APP_NAME`
- `APP_URL`（生产公开 HTTPS origin，本地可不配置）
- `DATABASE_URL`
- `APP_DATABASE_PASSWORD`（仅生产迁移任务使用，用于轮换无 DDL 权限的 Web 运行账号）
- `LOCAL_AUTH_SECRET`（会话 cookie 的 HMAC 签名密钥，生产必填、至少 32 位）
- `ADMIN_USER_EMAILS` / `ADMIN_USER_IDS`
- `MODERATOR_USER_EMAILS` / `MODERATOR_USER_IDS`
- `CATALOG_CRAWLER_SCHEDULER`（长驻服务默认开启，北京时间 10:00 / 22:00）
- `CATALOG_ASSET_DIR`（采集标准图的持久化目录）

## Documentation Map

- `docs/prd.md`: product scope, goals, non-goals, and V1 capabilities
- `docs/schema.md`: domain model summary centered on SKU
- `docs/ui-guidelines.md`: visual and interaction direction for the encyclopedia experience
- `docs/architecture.md`: 请求边界、目录职责与各项领域不变式
- `docs/project-status.md`: 当前能力、已知缺口与文档地图
- `docs/mobile-first-transformation-plan.md`: 推进中的分阶段改造计划
- `docs/deployment.md`: 运行时环境变量与生产不变式（上线步骤见根目录 `DEPLOY.md`）
- `docs/release-regression-checklist.md`: 桌面 / 移动 Web / Android 回归清单
- `docs/catalog-crawler.md`: 白名单采集、图片标准化、审核发布与定时运行说明

## Current Status

生产环境已上线：<https://gubugu.tlines.tech>。图鉴、搜索、收藏点亮、扫描识别、完整换谷闭环、社区、通知与后台均已可用，应视为可运行的产品基线而非脚手架。

当前主要缺口见 [docs/project-status.md](docs/project-status.md)：识别质量仍需按真实设备标定，首发内容覆盖仍需持续扩充；桌面导航与宽屏容器已经完成。

When implementing features, keep these constraints in mind:

- prefer Server Components by default
- use Client Components only for interactions and browser APIs
- validate boundary inputs with Zod
- keep schema changes migration-driven
- keep code maintainable for long-term solo iteration

## Completeness Contract

This repository does not allow dead-end UI.

- any primary CTA, button, or entry label that looks interactive must either navigate to a real route or submit to a real backend action
- if a feature is exposed in the UI, the corresponding page or flow must exist and be reachable without hidden URLs
- frontend states must be wired to backend data or server actions; do not leave decorative controls that never persist or resolve
- if a browse surface is not ready, keep it out of the UI instead of shipping a placeholder entrance
- when a feature needs explanation text, that text does not replace the requirement for a usable route or action
