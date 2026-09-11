# 项目现状报告

> 更新时间：2026-09-11。路由、测试和迁移数量由 `pnpm project:metrics` 重新生成，别让它退化成
> 又一份「看起来还对」的旧快照。

## 一、基本信息

| 项目     | 值                                                    |
| -------- | ----------------------------------------------------- |
| 项目路径 | `E:\Codes\gubugu`                                     |
| 项目名称 | gubugu（谷布谷 / Gooods Dex）                         |
| 定位     | 谷子（动漫 / 游戏 / IP 周边）收藏图鉴与收藏关系网络   |
| 包管理器 | pnpm 9.15.0（已在 `packageManager` 中钉死）           |
| 当前分支 | `chore/engineering-foundation`（内容已同步到 `main`） |
| 提交总数 | 80                                                    |
| 迁移     | 30 个（0000–0029）                                    |
| 测试     | 45 个文件 / 284 条                                    |
| 路由     | 46 条 page / route                                    |

**生产环境已上线**：<https://gubugu.tlines.tech>，部署在一台 Linux VPS，与同机的另一个
项目共存但完全隔离。细节见 [../DEPLOY.md](../DEPLOY.md) 与 [deployment.md](deployment.md)。

## 二、技术栈

Next.js 16.1.7（App Router，RSC + Server Actions）· React 19.2.3 · TypeScript 5.9 ·
Drizzle ORM 0.45 + PostgreSQL 16 · Tailwind CSS v4 · Zod 4 · Vitest · sharp 0.33.5 ·
`@huggingface/transformers`（CLIP）· Capacitor（Android 薄壳）。

**认证完全自托管**：账号存在自建 PostgreSQL（scrypt 口令哈希），会话是 HMAC 签名的
Cookie，登录与注册都有限流。不依赖任何外部认证服务。

架构取向：**重后端 / 薄前端**——页面为 Server Components，取数走 `server/data/*`，
变更走 Server Actions（Zod 校验 + 鉴权 + 所有权校验），客户端不直连数据库；多端复用
同一领域层，必要时经 `/api/v1` 暴露。

## 三、已具备的能力

### 图鉴与搜索

- IP / Character / Series / Goods SKU 四级图鉴，SKU 为核心实体
- 统一公共谷库 `/search`，搜索与标签筛选，商品搜索已做索引优化
- 读取带缓存失效标签；**公共图鉴始终原色**，点亮与否由印章与文案表达

### 收藏与点亮

- 用户状态 `owned` / `wanted` / `exchange`，含数量、可换数量、愿望优先级
- 「收进谷柜」与「扫描点亮」分离，`lit_at` 记录首次点亮时间
- 完成度、成就、角色收藏圈均要求真实点亮
- 识别链路：相机 → 服务端 embedding → `recognition_attempts` → 确认 → 事务写入
  `owned + lit_at`。浏览器无法直接提交 SKU 获得点亮；Mock 与普通上传不能点亮
- 未匹配的扫描存为**私密未鉴定项**，图片不进公开资产区（见下）

### 换谷（以物换物）

- 双向 / 三方匹配引擎（纯函数打分，`lib/matching/*`）
- 公开换谷帖、正式报价 + 最多三次反提、库存预留、履约状态机
- 私信 / 未读 / 举报 / 拉黑；完成后双方独立评价与信誉摘要
- 定价市场（人民币挂单）运行时已下线，schema 保留兼容

### 社区与后台

- 帖子 / 图片 / 评分；关注、Feed、圈子、通知（含蹲谷订阅提醒）
- 社区配图存入 VPS 公开资产区（内容寻址），不再以 base64 写进数据库
- `/api/v1` 提供认证后的收藏、匹配、换谷单、通知读取（统一 envelope）
- 后台：图鉴管理、审核、采集草稿（北京时间 10:00 / 22:00 定时）

### 分享卡

`/goods/[goodsSlug]/share` 输出 1080 × 1440 PNG，由 sharp（librsvg + Pango）合成——
手写 SVG 栅格化后叠加主图。此前用 Satori/resvg，在部署机上单张约 11.8 秒；改法后约
195 毫秒，体积也从 449KB 降到 242KB。

### 工程与部署

- RLS 已启用并有独立验证脚本（以不拥有表的角色实测策略）
- 幂等三账号种子；点亮 / RLS / 换谷三套数据库验证脚本
- Vitest + CI（GitHub Actions）；ESLint / Prettier 全绿
- Docker 镜像（runner + migrator）经 CI 推 GHCR，SSH 部署到 VPS
- 构建前置检查会声明本次构建模式并列出数据库不可用时降级的页面

## 四、资产与隐私边界

| 区域     | 内容                           | 读取方式                                             |
| -------- | ------------------------------ | ---------------------------------------------------- |
| 公开资产 | 官方图、采集发布图、社区帖子图 | `/catalog-assets/[fileName]`，可长期缓存             |
| 私密资产 | 未鉴定扫描图                   | `/api/user-scans/[scanId]/image`，需会话且限定所有权 |

私密路由校验资产名格式以防路径穿越，对他人返回 404 而非 403（不泄露资源是否存在），
响应为 `private` 缓存。两区目录、路由、缓存策略均不共用。

## 五、已知缺口

按 [mobile-first-transformation-plan.md](mobile-first-transformation-plan.md) 的阶段划分：

- **识别校准**：自动点亮与候选确认已走同一事务，阈值也已可按环境配置；
  仍需用真实样本运行 `pnpm recognition:evaluate` 完成校准。
- **生产运维验收**：新的 readiness、备份脚本和独立数据库运行角色已入库，
  尚需在 VPS 上配置 `APP_DATABASE_PASSWORD` 和 cron，并执行一次恢复演练。
- **Android 发布验收**：已关闭明文流量和应用备份，CI 已加入 Gradle 构建；
  真机相机、返回键、深链和断网恢复仍需发布前人工回归。
- **内容覆盖不足**：首发目标是十几个主流 IP、数百个 SKU，当前仅有种子数据。
- **部署机 CPU 限制**：VPS 是 x86-64-v1（QEMU 通用型号），sharp 因此固定在 0.33.5；
  CLIP 推理没有 SIMD/AVX 加速，比设计预期慢。换 CPU 型号可解，非阻塞项。
- **`images/` 不入库**：它是 `db:seed` 的样图源，已按决定加入 `.gitignore`，因此任何
  非本机环境 seed 出来的商品图都是占位 SVG。正式内容走采集管线。

## 六、文档地图

| 文件                                  | 内容                                    |
| ------------------------------------- | --------------------------------------- |
| `../DEPLOY.md`                        | 上线步骤（VPS、镜像、反代、数据初始化） |
| `deployment.md`                       | 运行时参考：环境变量与生产不变式        |
| `architecture.md`                     | 请求边界、目录职责、各项领域不变式      |
| `schema.md`                           | 以 SKU 为中心的领域模型                 |
| `prd.md`                              | 产品范围、目标、非目标                  |
| `mobile-first-transformation-plan.md` | 当前推进中的分阶段改造计划              |
| `release-regression-checklist.md`     | 桌面 / 移动 Web / Android 三类回归清单  |
| `ui-guidelines.md`                    | 视觉与交互方向                          |
| `catalog-crawler.md`                  | 白名单采集、图片标准化、审核发布        |
| `recognition-options.md`              | 识别方案调研与取舍                      |
| `design-site-snapshot.md`             | 站点设计快照                            |
| `refactor-execution-plan.md`          | 历史重构计划（已完成，留档）            |

## 七、常用命令

```bash
pnpm dev              # 本地开发（127.0.0.1）
pnpm lint             # ESLint
pnpm typecheck        # tsc --noEmit
pnpm test             # Vitest
pnpm build            # 生产构建（含构建前置检查）
pnpm db:migrate       # Drizzle 迁移
pnpm db:generate      # 改了 schema 后必跑，否则线上会缺列
pnpm db:seed          # 种子（幂等；生产不写演示凭据）
pnpm db:embed         # 为图鉴图片生成 CLIP 向量
pnpm db:verify-rls    # 验证 RLS（需已迁移、已种子的数据库）
pnpm crawler:run      # 手动跑一次目录采集
```
