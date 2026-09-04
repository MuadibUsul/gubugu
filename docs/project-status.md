# 项目路径与推进现状报告

> 生成时间：2026-08-23（基于当前工作区扫描）

## 一、项目路径与基本信息

| 项目     | 值                                                  |
| -------- | --------------------------------------------------- |
| 项目路径 | `E:\Codes\gubugu`                                   |
| 项目名称 | gubugu（谷布谷 / Gooods Dex）                       |
| 定位     | 谷子（动漫 / 游戏 / IP 周边）收藏图鉴与收藏关系网络 |
| 版本     | 0.1.0（私有）                                       |
| 包管理器 | pnpm                                                |
| 当前分支 | `chore/engineering-foundation`                      |
| 主分支   | `main`（远端已有同步分支）                          |
| 提交总数 | 26（最近提交 `752ea1c`，2026-08-17 19:04）          |

## 二、技术栈

Next.js 16.1.7（App Router，RSC + Server Actions）· React 19.2.3 · TypeScript 5.9 ·
Drizzle ORM 0.45 + PostgreSQL · Supabase Auth · Tailwind CSS v4 · Zod 4 ·
Vitest · sharp · pnpm。

架构取向：**重后端 / 薄前端**——页面为 Server Components，取数走
`server/data/*` 仓储层，变更走 Server Actions（zod 校验 + 鉴权 + 所有权校验），
客户端不直连数据库；未来多端复用同一领域层，通过 `/api/v1` HTTP JSON 暴露。

## 三、推进现状（已完成能力）

### 图鉴与搜索

- IP / Character / Series / Goods SKU 四级图鉴，SKU 为核心实体
- 统一公共谷库 `/search`，支持搜索与标签筛选，商品搜索已做索引优化
- 图鉴读取带缓存失效标签（invalidation tags）

### 收藏与点亮

- 用户状态 `owned` / `wanted` / `exchange`；收藏支持数量、可换数量、愿望优先级
- 「收进谷柜」与「扫描点亮」分离，`lit_at` 记录首次点亮时间
- 完成度、成就（収蔵記録）、角色收藏圈均要求真实点亮
- 相机识别入口：framing → 上传 → embedding 相似候选 → 用户确认点亮；
  只有真实 `camera + embedding-search` 候选才能点亮，上传图 / Mock 只能看彩图

### 换谷（以物换物）

- 双向 / 三方匹配引擎（纯函数打分，`lib/matching/*`）
- 公开换谷帖 `/matches`、正式报价 + 最多三次反提、库存预留、履约状态机
- 私信 / 未读 / 举报 / 拉黑；完成后双方独立评价与信誉摘要
- 定价市场（人民币挂单 / 订单 / 模拟支付）运行时已下线，schema 保留兼容

### 社区与后台

- 帖子 / 图片 / 评分；关注、Feed、圈子、通知（含蹲谷订阅提醒）
- `/api/v1` 提供认证后的收藏、匹配、换谷单、通知读取接口（统一 envelope）
- 后台：图鉴管理、审核、采集草稿（catalog crawler，北京时间 10:00 / 22:00 定时）

### 工程基础

- RLS 行级安全已启用；24 个连续迁移（0000–0023）
- 幂等三账号种子、点亮不变式 / RLS / 换谷验证脚本齐备
- Vitest 测试套件 + CI（GitHub Actions）；ESLint / Prettier 已配置
- 生产部署手册（`docs/deployment.md`）、采集说明（`docs/catalog-crawler.md`）

## 四、路由清单（共 40 条 page / route）

- 首页 `/`；谷库 `/search`；商品详情 `/goods/[goodsSlug]`
- IP 页 `/ips/[ipSlug]`、角色页 `/ips/[ipSlug]/characters/[characterSlug]`
  （含收藏圈 `circle`）、系列页 `/ips/[ipSlug]/series/[seriesSlug]`
- 识别入口 `/recognition`；登录 `/login`；认证回调 `/auth/callback`
- 换谷 `/matches`、`/matches/new`、`/matches/[listingId]`、`/matches/offers/[offerId]`
- 我的：`/me`（含 collection / exchanges / feed / messages / notifications / profile）
- 用户主页 `/users/[handle]`
- 后台 `/admin`（catalog / goods / moderation / crawler / crawler drafts）
- API：`/api/v1/collection|exchanges|matches|notifications`、
  `/api/recognition/candidates`、`/api` 资源路由（demo-assets / catalog-assets）

## 五、当前工作区状态（重要）

当前分支 `chore/engineering-foundation` 上存在**大量未提交改动**：

- `git status` 显示 218 个文件变更，diff 统计 115 个文件、+6264 / −5925 行
- 涉及面广：`app/` 页面、`components/`、`server/`、`lib/`、`docs/`、`README.md`、
  `.env.example`、`drizzle/` 等；部分组件被删除（如 `admin-goods-table`、
  `goods-exchange-panel` 等旧实现）
- 推测这是「工程地基」分支的一次大范围重构，尚未提交

**提示**：最近一次提交是 8 月 17 日，工作区改动约一周未落盘。若这些改动是
在途工作，建议先提交或确认保存状态，避免丢失。

## 六、文档地图（docs/）

| 文件                                                 | 内容                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------- |
| `prd.md`                                             | 产品范围、目标、非目标、V1 能力                            |
| `plan.md`                                            | 全项目重构执行蓝图（北极星、现状审计、目标架构、验收标准） |
| `schema.md`                                          | 以 SKU 为中心的领域模型                                    |
| `architecture.md`                                    | 技术基础与初始化步骤                                       |
| `ui-guidelines.md`                                   | 图鉴体验的视觉与交互方向                                   |
| `deployment.md`                                      | 生产部署手册                                               |
| `catalog-crawler.md`                                 | 白名单采集、图片标准化、审核发布、定时运行                 |
| `recognition-options.md` / `design-site-snapshot.md` | 识别方案调研与站点设计快照                                 |

## 七、建议的下一步

1. 处理 `chore/engineering-foundation` 分支上的未提交改动（提交或整理）
2. 对改动集跑一遍 `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm build` 确认全绿
3. 数据库侧如未迁移，执行 `pnpm db:migrate` + `pnpm db:seed`，可选 `pnpm db:verify-rls`

## 八、常用命令

```bash
pnpm dev              # 本地开发（127.0.0.1）
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest
pnpm build            # 生产构建
pnpm db:migrate       # Drizzle 迁移
pnpm db:seed          # 种子（幂等）
pnpm db:verify-rls    # 验证 RLS（需要已迁移、已种子的数据库）
pnpm crawler:run      # 手动跑一次目录采集
```
