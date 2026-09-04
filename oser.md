# 谷布谷 项目简介、技术架构与项目路径

> 扫描基准：2026-08-26，工作区 `E:\Codes\gubugu`。本文基于当前代码实际状态编写。

## 1. 项目简介

谷布谷（GUBUGU）是一个 **PC 优先、移动 Web 响应式**的谷子（动画 / 游戏 / IP 周边）图鉴与收藏协作平台。产品定位为「谷子收藏关系网络」：以标准图鉴为数据底座，以谷柜 / 愿望单构建收藏身份，以匹配引擎寻找双向 / 多向**以物换物**关系，以收藏关系驱动人与人之间的社交。

核心实体是 **SKU**（数据库表 `goods`），所有用户行为——收藏、识别、匹配、换谷、评价、蹲谷通知——都收敛到 SKU 级记录。

V1 功能范围：

- IP、角色、系列、SKU 四级图鉴与搜索、标签 / 属性筛选；
- 用户收藏状态 `owned` / `wanted` / `exchange`；`owned + lit_at` 区分「已入柜」与「相机扫描点亮」；
- 收藏完成度、成就、角色收藏圈、排行榜；
- 评论、评分、晒图、关注、Feed、私信、通知、举报与拉黑；
- 无现金以物换物：匹配引擎、公开换谷帖、正式报价（最多三次反提）、双方履约、信誉评价、三方协调提案；
- 相机识别入口：拍摄 / 上传 → CLIP 向量 → SKU 候选 → 服务端确认点亮；
- SKU 高清分享谷卡（OG 图片）、下载与系统分享；
- 管理后台：图鉴维护、SKU / 标签 / 官图管理、内容审核、举报处理、**采集工作台（白名单来源爬虫 + 草稿审核发布）**；
- 面向未来薄客户端的认证 JSON API（`/api/v1`）。

V1 明确不是人民币 C2C 市场：不包含支付、托管、仲裁、存款流程。旧定价市场表（`listings`、`orders`、`payments` 等）仅为历史兼容保留，无用户运行时入口。换谷帖被数据库约束永久禁止现金。

## 2. 技术架构

### 2.1 技术栈

| 层级       | 当前实现                                                    |
| ---------- | ----------------------------------------------------------- |
| Web 框架   | Next.js 16 App Router、React 19、Server Components          |
| 语言       | TypeScript 5.9，`strict: true`                              |
| 样式       | Tailwind CSS 4、shadcn/ui 基础组件、全局设计 token          |
| 数据库     | PostgreSQL、`pg` 连接池                                     |
| ORM / 迁移 | Drizzle ORM、Drizzle Kit，迁移 `0000`–`0027`                |
| 边界校验   | Zod 4                                                       |
| 认证       | 生产 Supabase Auth；本地 PostgreSQL 密码账号 + 签名 Cookie  |
| 文件存储   | Supabase Storage；本地种子图使用生成目录                    |
| 图片识别   | Transformers.js + CLIP 图像向量、JSONB 向量存储、余弦相似度 |
| 采集爬虫   | 自研白名单爬虫 + LLM 结构化中文化（deepseek-chat）          |
| 测试       | Vitest，共 40 个 `*.test.ts` 文件                           |
| 质量工具   | ESLint、Prettier、TypeScript、RLS / 换谷 / 点亮验证脚本     |
| 包管理     | pnpm                                                        |

仓库规模：约 64 个 `app/` 路由与 API 文件、60 个 `components/` 组件、79 个 `lib/` 文件、78 个 `server/` 文件、44 张数据库表、16 个 Server Action 模块。

### 2.2 总体架构

单仓库、单进程、**模块化单体**。没有微服务、消息队列、全局客户端状态库或重复业务后端。方向为「重后端 / 薄前端（Server-Driven）」：后端是唯一可信的业务逻辑来源，前端只负责渲染、交互与本地 UI 状态。

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
             │               匹配 / 状态机 / 评分 / 收藏
             └───────────┬───────────┘
                         ▼
                Drizzle ORM + pg Pool
                         │
                         ▼
                    PostgreSQL

采集旁路：白名单来源 → 抓取解析 → LLM 中文化 → 草稿队列 → 管理员审核发布
识别旁路：相机/上传 → CLIP 向量 → SKU 候选 → 服务端 attempt → 确认点亮
认证旁路：Supabase Auth（生产）/ PostgreSQL 账号 + 签名 Cookie（本地）
图片旁路：Supabase Storage（社区图）/ 本地样例图（开发种子）
```

### 2.3 分层职责

| 路径                  | 职责                                                       | 约束                                                                  |
| --------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `app/`                | URL 路由、RSC 页面、Route Handler、loading/error/not-found | 页面只编排数据和渲染，不直接承载领域规则                              |
| `components/`         | 页面区块、交互组件、UI 原语                                | 默认服务端组件，仅浏览器 API、表单状态和局部交互使用 Client Component |
| `server/*/actions.ts` | 写操作、鉴权、Zod 校验、事务、缓存失效                     | 所有业务写入从这里进入                                                |
| `server/data/`        | Drizzle 查询和视图模型装配                                 | `server-only`，不进入客户端 bundle                                    |
| `lib/`                | 纯函数、schema、配置、领域状态机                           | 尽量无数据库依赖，可直接单测                                          |
| `drizzle/schema/`     | PostgreSQL schema 和关系（唯一来源）                       | 所有 schema 变化必须配迁移                                            |
| `drizzle/migrations/` | 线性数据库历史                                             | 已执行迁移不可回写                                                    |
| `drizzle/seed/`       | 幂等演示数据和三账号验收关系                               | 不用于生产数据导入                                                    |
| `docs/`               | 产品、架构、部署、爬虫与设计文档                           | 部分历史文档可能早于当前精简结果                                      |

### 2.4 读写路径

读取路径：

```text
page.tsx / route.ts
  → server/auth（按需）
  → server/data/*
  → server/db/client.ts
  → Drizzle → PostgreSQL
  → 视图模型 → RSC HTML 或 API envelope
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

客户端不能直接提交可信的数量、匹配结果、换谷状态、评价归属或管理员权限，服务端会重新读取数据库并计算。

### 2.5 Server Components 与 Client Components

全站默认使用 Server Components。Client Components 仅用于：登录表单、收藏 / 评分 / 评论交互、搜索筛选、相机拍摄与识别结果、后台编辑表单、错误边界。没有 Redux、Zustand 或其他全局客户端状态库。

### 2.6 核心领域模块

- **图鉴与搜索**：`ips → series → goods`，角色经 `characters` 与 `goods_characters` 关联；`server/data/catalog.ts`、`catalog-browser.ts`、`search-service.ts` 装配详情、浏览与搜索；图鉴读取走 `unstable_cache`（300 秒兜底），后台修改通过 cache tag 主动失效。
- **收藏、成就与资料**：`user_goods` 以 `(user_id, goods_id, status)` 表达多状态；`owned + lit_at` 才是点亮收藏；完成度、成就、角色圈、匹配与换谷资格只统计已点亮；`lib/achievements.ts` 负责成就规则。
- **匹配与换谷**：`lib/matching/graph.ts`（互惠匹配 / 三方循环纯函数）、`lib/matching/score.ts`（0–100 分）；`server/data/matching.ts` 只加载两跳换谷邻域；`server/trade/actions.ts`（换谷帖 / 报价 / 反提，最多 3 次）与 `server/exchanges/actions.ts`（履约 / 取消 / 结算）是唯一写入边界；`lib/exchange/status.ts` 状态机 `draft → proposed → accepted → shipping → received → completed`；`server/trade/inventory.ts` 集中处理库存行锁、预留与结算。
- **社交与安全**：关注 `follows`、Feed、角色收藏圈、私信（每对用户唯一会话）、举报、拉黑、站内通知；`server/data/reputation.ts` 聚合信誉。
- **图片识别**：`/recognition` 相机入口；`POST /api/recognition/candidates` 上传校验（登录 / 频率 / MIME / 10MB）；`server/recognition/embedding.ts` 用 CLIP 生成 512 维向量；`server/data/recognition-search.ts` 服务端计算余弦相似度；15 分钟有效的 `recognition_attempts`；只有 `camera + embedding-search` 的确认能写 `lit_at`。
- **采集爬虫**：`lib/catalog-crawler/`（解析器 / 白名单来源 / 调度）与 `server/catalog-crawler/`（抓取服务、LLM 中文化 enrich、图片落盘、调度器）；`crawler_sources → crawler_runs → crawler_drafts → crawler_crawl_progress`；草稿必须经管理员在 `/admin/crawler` 审核发布（发布时自动匹配 / 新建 IP 与系列）。
- **管理后台**：`moderator` 进 `/admin`、`/admin/moderation`、`/admin/reports`；`admin` 额外进 `/admin/catalog`、`/admin/goods`、`/admin/crawler`；生产角色来自环境变量 allowlist，本地三账号映射 admin / 普通用户 / moderator。
- **排行**：`server/data/leaderboard.ts` 基于已点亮收藏聚合排行维度。

### 2.7 认证、授权与数据安全

- 生产用 Supabase Auth（`proxy.ts` 刷新 session，`server/auth/session.ts` 取用户）；本地用 `local_auth_accounts` + scrypt 密码哈希 + `gubugu-local-session` 签名 HttpOnly Cookie。
- `/me/*`、`/matches/*`、`/recognition` 要求登录；`/admin` 及审核页要求 moderator / admin 角色；用户主页按资料可见性（`public / followers / private`）在服务端判断。
- 数据库已有 RLS 策略（`pnpm db:verify-rls` 验证），但当前 Next.js 运行时经表 owner 连接（owner 绕过 RLS），因此运行时安全主防线是 `server/` 应用层鉴权；RLS 为未来 Supabase Data API / 薄客户端边界预留。
- `server/db/client.ts` 在 `globalThis` 缓存唯一 Drizzle + `pg.Pool` 上下文，HMR 与生产请求复用连接池。

### 2.8 移动端壳

`capacitor.config.ts` 提供 Capacitor 安卓壳（`android/`）：WebView 加载运行中的 Next 站点（SSR/RSC 无法静态导出）。开发期用 `adb reverse tcp:3000 tcp:3000`，上架前切换 HTTPS 域名并移除 cleartext。相机（`getUserMedia`）要求安全上下文。

## 3. 数据模型（44 张表）

| 分类       | 表                                                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 图鉴       | `ips`, `characters`, `series`, `goods`                                                                                        |
| 图鉴关系   | `goods_images`, `goods_image_embeddings`, `tags`, `goods_tags`, `goods_characters`                                            |
| 用户       | `profiles`, `local_auth_accounts`, `follows`, `user_goods`, `user_scans`                                                      |
| 识别       | `recognition_attempts`                                                                                                        |
| 社区       | `catalog_submissions`, `posts`, `post_images`, `ratings`                                                                      |
| 采集爬虫   | `crawler_sources`, `crawler_runs`, `crawler_drafts`, `crawler_crawl_progress`                                                 |
| 换谷       | `exchange_listings`, `exchange_offers`, `exchange_offer_revisions`, `exchanges`, `exchange_reviews`, `coordination_proposals` |
| 私信       | `direct_conversations`, `direct_messages`, `user_blocks`                                                                      |
| 安全与通知 | `notifications`, `reports`, `goods_watches`                                                                                   |
| 成就       | `achievements`, `user_achievements`                                                                                           |
| 历史兼容   | `listings`, `listing_photos`, `want_orders`, `orders`, `payments`, `market_transactions`（无运行时入口）                      |

## 4. 项目路径

### 4.1 根目录

```text
E:\Codes\gubugu
├─ AGENTS.md            # 工作区指令：产品定位、范围、架构规则、验证命令
├─ README.md            # 英文产品与栈介绍
├─ plan.md              # 重构执行蓝图（收藏关系网络方向）
├─ strugle.md           # 2026-08-22 架构与路径快照（早于本文件）
├─ oser.md              # 本文件
├─ package.json         # pnpm 脚本：dev / build / lint / typecheck / test / db:* / crawler:run
├─ pnpm-lock.yaml
├─ tsconfig.json / next.config.ts / drizzle.config.ts
├─ eslint.config.mjs / prettier.config.mjs / postcss.config.mjs
├─ vitest.config.ts / components.json / .env.local / .env.example
├─ proxy.ts             # Supabase session 刷新中间件
├─ instrumentation.ts   # Node 运行时环境校验 + 识别模型预热 + 爬虫调度器启动
├─ capacitor.config.ts  # 安卓壳配置
├─ android/             # Capacitor 安卓工程
└─ images/              # 项目图片素材
```

### 4.2 源码目录

```text
app/                     # 路由树（64 个文件）
├─ page.tsx              # 首页：作品入口、最近 SKU、搜索入口
├─ search/               # 公共谷库搜索 / 标签 / 属性筛选
├─ ips/[ipSlug]/         # IP 图鉴、角色、角色收藏圈、系列图鉴
├─ goods/[goodsSlug]/    # SKU 详情、share（OG 分享谷卡）
├─ users/[handle]/       # 用户收藏主页、badges
├─ leaderboard/          # 排行
├─ matches/              # 换谷广场、发布帖、报价详情、协商
├─ me/                   # 个人中心、collection、exchanges、feed、messages、notifications、profile
│                        # （coordination / network / orders 目录为空，待建）
├─ recognition/          # 相机识别入口
├─ login/                # 登录 / 注册（本地或 Supabase）
├─ admin/                # 后台总览、catalog、goods、moderation、reports、crawler（含 drafts/[draftId] 审核页）
├─ api/recognition/      # candidates、scan Route Handlers
├─ api/v1/               # collection、matches、exchanges、notifications 认证 JSON 读取接口
├─ catalog-assets/       # 商品图静态服务
├─ demo-assets/          # 本地演示资产生成
├─ offline/              # 离线页
└─ layout.tsx / loading.tsx / error.tsx / not-found.tsx / forbidden.tsx

components/              # 60 个组件
├─ ui/                   # UI 原语（button、input 等）
├─ admin/                # 后台 shell、crawler shell、catalog/goods 编辑表单、moderation shell
├─ collection/ goods/ search/ character/ exchange/ marketplace/ messages/
├─ recognition/          # 相机取景、上传、候选结果
├─ auth/ app-shell/ layout/ home/ user/ safety/
└─ ...

lib/                     # 79 个文件，纯函数与配置
├─ api/                  # API envelope
├─ auth/                 # 本地密码、会话 token、演示账号
├─ catalog-crawler/      # 爬虫解析器、白名单来源、调度
├─ config/               # 站点配置、演示 viewer
├─ exchange/             # 换谷状态机、协商、履约进度
├─ matching/             # 匹配图、评分
├─ marketplace/ payments/ fees/ identity/ integrations/   # P2 接口与占位（V1 不实例化）
├─ supabase/             # 配置、中间件、服务端、存储
├─ achievements.ts / leaderboard.ts / goods-type.ts / goods-rating.ts / collection-frame.ts
├─ rate-limit.ts         # 单进程固定窗口限流
├─ internal-path.ts / css-url.ts / image-upload.ts / formatters.ts / slug.ts
└─ ...（含 *.test.ts 单测）

server/                   # 78 个文件，仅服务端
├─ auth/                 # session、admin 角色
├─ data/                 # 仓储层：catalog、search、goods-detail、matching、trade、exchanges、
│                        # community、feed、follows、messages、notifications、profiles、reputation、
│                        # leaderboard、user-goods、recognition-search、admin-*、moderation
├─ admin/                # catalog / goods / crawler / moderation / reports 的 actions
├─ user-goods/ community/ social/ follow/ profile/ trade/ exchanges/ messages/ notifications/ recognition/
│                        # 各领域 actions.ts
├─ catalog-crawler/      # 抓取服务、LLM 中文化、图片落盘、调度器
├─ db/client.ts          # Drizzle + pg.Pool 唯一上下文（server-only）
└─ env.ts                # 启动时环境校验

drizzle/
├─ schema/index.ts       # 44 张表 + 关系的唯一来源
├─ migrations/           # 0000–0027 线性迁移 + meta
├─ seed/index.ts         # 幂等三账号演示数据
├─ embed/index.ts        # 图鉴图片向量建索引
└─ verify-rls.mjs / verify-trade.mjs / verify-lighting.mjs   # 策略验证脚本

scripts/
└─ crawl-catalog.ts      # 命令行跑一次采集（pnpm crawler:run）

test/
└─ stubs/                # vitest 环境桩（server-only 等）

docs/                    # 产品与工程文档
├─ prd.md / project-status.md / architecture.md / schema.md
├─ deployment.md / ui-guidelines.md / design-site-snapshot.md
├─ catalog-crawler.md / catalog-crawler-continuation-plan.md
└─ recognition-options.md / refactor-execution-plan.md
```

## 5. 常用命令

| 命令                                                      | 作用                       |
| --------------------------------------------------------- | -------------------------- |
| `pnpm dev`                                                | 本地开发（127.0.0.1:3000） |
| `pnpm build` / `start`                                    | 生产构建与启动             |
| `pnpm lint` / `typecheck`                                 | 静态检查                   |
| `pnpm test`                                               | Vitest 单测                |
| `pnpm db:generate` / `db:migrate`                         | 生成并执行迁移             |
| `pnpm db:seed`                                            | 幂等种子数据（含三账号）   |
| `pnpm db:embed`                                           | 图鉴图片向量索引           |
| `pnpm db:verify-rls` / `verify-trade` / `verify-lighting` | 策略验证                   |
| `pnpm crawler:run`                                        | 手动执行一次采集           |
| `pnpm cap:sync`                                           | 同步安卓壳                 |
