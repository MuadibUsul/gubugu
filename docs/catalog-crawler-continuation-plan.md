# 谷库采集功能续跑计划

更新时间：2026-08-22（Asia/Shanghai）

## 1. 本次目标

管理员可以维护有权采集的页面白名单；系统每天北京时间 10:00、22:00 扫描启用来源，把新增谷子详情和标准化图片提交为待审核草稿。管理员必须核对、修改并明确选择 IP / 系列后，才能把草稿发布到公共谷库。

任何抓取结果都不能直接写入公开 SKU。

## 2. 已完成

### 数据库

- 新增 `crawler_sources`：来源名称、入口 URL、详情路径特征、额外图片域名、启停、最近扫描结果。
- 新增 `crawler_runs`：定时 / 手动触发、运行状态、发现 / 入队 / 更新 / 跳过 / 失败计数和错误摘要。
- 新增 `crawler_drafts`：来源商品键、内容哈希、结构化 payload、待审核 / 已发布 / 已拒绝状态、发布后 SKU 关联。
- 三张表均启用 RLS 且没有客户端 policy，只能通过服务端访问。
- 同一来源 + 商品键唯一；同一来源 + 定时时段唯一；同一来源最多一个运行中任务。
- 已生成并应用 `0023_marvelous_komodo.sql` 到本地数据库。

### 抓取与图片

- JSON-LD `Product` / `@graph` / `ItemList` 解析。
- 商品型 OpenGraph 回退解析。
- 可按同域“详情路径特征”发现详情链接；单来源每轮最多 24 个详情页。
- 精确域名白名单、HTTP(S) / 凭据 / 端口限制、DNS 公网地址检查、逐跳重定向复核、10 秒超时、HTML 2 MiB / 图片 10 MiB 上限和 MIME 检查。
- 单草稿最多 4 张图片。
- 图片只接受 JPEG / PNG / WebP，拒绝动画，限制 4000 万解码像素。
- 应用 EXIF 方向并剥离 EXIF / GPS；转 sRGB；主体不放大，等比放入 1344 × 1680 安全区；输出 1600 × 2000、质量 88 WebP。
- 以输出字节 SHA-256 命名，存到 `CATALOG_ASSET_DIR`（默认 `.data/catalog-assets`），通过 `/catalog-assets/<hash>.webp` 提供不可变缓存。

### 调度

- 长驻 Next.js 进程默认 `CATALOG_CRAWLER_SCHEDULER=1`。
- 北京时间每天 10:00 / 22:00（UTC 02:00 / 14:00）运行。
- `instrumentation.ts` 启动原生定时器；数据库唯一约束防 HMR / 多实例重复。
- 提供 `pnpm crawler:run` 给外部平台调度；脚本以最新固定时段作为幂等键，并在完成后关闭数据库连接池。
- 非长驻部署应设 `CATALOG_CRAWLER_SCHEDULER=0`，由平台在两个时刻调用 CLI。

### 后台与发布

- `/admin/crawler`：白名单来源、审核草稿、运行记录三个视图。
- 可新增 / 编辑 / 启停来源，可单源手扫或扫描全部启用来源。
- `/admin/crawler/drafts/[draftId]`：来源快照 + 复用现有 SKU 编辑器。
- 审核草稿不再自动选择第一个系列；管理员必须主动选择 IP / 系列。
- 商品编辑器已补齐制造 / 发行方、地区、官方性质、资料核验字段。
- 采集草稿只能创建新 SKU，不能覆盖旧 SKU；审核通过必须以 `published` 状态入库。
- 发布事务会锁定待审核草稿，在同一事务中创建 SKU、标签、图片并把草稿标记已发布；并发重复提交会被拒绝。
- 只有 `admin` 有采集权限，`moderator` 无权进入或调用 Action。

### 文档

- `docs/catalog-crawler.md`：使用、解析边界、图片标准、调度和运维。
- `docs/deployment.md`、`.env.example`、`README.md` 已补环境变量和部署说明。

## 3. 已完成验证

- `pnpm db:migrate`：通过，`0023` 已应用。
- `pnpm db:verify-rls`：49 / 49 通过，包含采集三表不可读写验证。
- `pnpm db:verify-lighting`：6 / 6 通过。
- `pnpm db:verify-trade`：10 / 10 通过。
- `pnpm lint`：通过。
- `pnpm typecheck`：通过。
- `pnpm test`：35 个文件、203 项测试通过。
- `pnpm format:check`：通过。
- `pnpm build`：通过；新路由 `/admin/crawler`、草稿详情和 `/catalog-assets/[fileName]` 均进入生产构建。
- 浏览器桌面与 360px 视口已验证采集工作台、三个视图、管理员权限和无横向溢出。
- `pnpm crawler:run` 已能启动；随后刚补了连接池主动关闭，需要按下方步骤重跑一次确认耗时。

## 4. 当前现场状态

- 开发服务器正在 `http://127.0.0.1:3000` 运行；本轮启动会话 ID 为 `41400`。
- 临时文件 `scripts/crawler-e2e-fixture.ts` 已创建，但**尚未运行**，所以本地数据库目前没有这份端到端测试数据。
- 工作区原本就有大量用户 / 前序功能改动，不得 reset、checkout 或清理无关文件。
- 真实外站成功扫描尚未执行：用户还没有提供具有采集权的白名单 URL，不应擅自抓取第三方商城。

## 5. 剩余执行顺序

### A. 完成 CLI 快速退出验收

运行：

```bash
pnpm crawler:run
```

预期：无来源时成功退出，不再等待 PostgreSQL pool 的约 10 秒 idle timeout。

### B. 跑发布事务端到端测试

1. 执行：

   ```bash
   pnpm exec tsx scripts/crawler-e2e-fixture.ts
   ```

2. 保存输出的 `sourceId`、`draftId`、`sku`、`slug`。
3. 浏览器打开 `/admin/crawler/drafts/<draftId>`。
4. 验证系列下拉初始为“请先确认归属 IP / 系列”，不选择时浏览器阻止提交。
5. 选择一个演示系列，核对 SKU、类型、材质、尺寸、价格、制造方、标签。
6. 点击“审核通过并发布到谷库”。
7. 验证跳回 `/admin/crawler?view=drafts&notice=draft-published`，显示成功反馈。
8. 数据库验证：
   - `crawler_drafts.status = 'published'`
   - `crawler_drafts.published_goods_id` 非空
   - `goods.sku_code = <fixture sku>` 且 `status = 'published'`
   - 新 SKU 的 `goods_tags` 有 `crawler-e2e` 标签
   - 草稿与 SKU 的写入要么全部存在，要么全部不存在

### C. 清理仅由本次测试创建的数据

先用精确 `sourceId` / `sku` 复核目标，再按顺序：

1. 删除测试 `crawler_sources`（级联删除测试 draft，先解除 `published_goods_id` 的 restrict 依赖）。
2. 删除 `sku = <fixture sku>` 的测试 goods（级联 goods_tags / goods_images）。
3. 仅当没有任何 `goods_tags` 引用时，删除 slug 为 `crawler-e2e` 的测试 tag。
4. 用 `apply_patch` 删除 `scripts/crawler-e2e-fixture.ts`。

严禁按名称模糊删除或影响真实采集来源 / SKU。

### D. 重跑最终检查

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm db:verify-rls
pnpm db:verify-lighting
pnpm db:verify-trade
pnpm build
```

构建前先停止开发服务器，构建结束后重新执行 `pnpm dev`，确保项目留在可查看状态。

### E. 用户提供真实白名单后再验收外站

对每个 URL 先确认采集授权，再：

1. 在 `/admin/crawler` 添加来源；分类页填写详情路径特征，图片 CDN 填精确额外域名。
2. 手动扫描一次。
3. 查看运行记录和草稿字段 / 图片。
4. 若显示“需要专用适配器”，只为该站点添加小型 adapter，不引入 Playwright / 无头浏览器。
5. 抽查标准图的构图、清晰度、色彩、EXIF 清除和 4:5 尺寸。

## 6. 已知边界与后续增强

### 当前必须明确告知

- 通用解析器无法可靠处理纯 JavaScript 渲染或私有结构页面；需要逐站适配。
- 白名单是技术边界，不替代站点条款、robots 和图片版权授权。
- 应用停机时，进程内定时器不会补跑；生产要用 systemd timer / 平台调度保证补跑。
- 当前 DNS 在请求前验证所有解析地址，但原生 fetch 连接时仍存在理论上的 DNS rebinding 时间窗。白名单来源只允许管理员维护，仍应优先选择稳定官方域名；后续可改为固定已验证 IP 的 transport。
- 发布后的新图片要执行 `pnpm db:embed` 才会加入真实识别候选；SKU 本身会立即正常发布。
- 本地持久目录适用于当前单机自建部署。多实例需要共享磁盘或对象存储 adapter。

### 可后续做，但本次不要擅自扩展

- 指定站点 adapter。
- 发布后异步 embedding worker。
- 对象存储 adapter。
- 基于图片感知哈希的近似重复检测。
- 外部 Cron HTTP 入口（若部署平台无法运行 CLI）。
- 管理员草稿字段 diff / 同 SKU 跨来源重复提示。

## 7. 关键文件

- Schema / migration：`drizzle/schema/index.ts`、`drizzle/migrations/0023_marvelous_komodo.sql`
- 解析：`lib/catalog-crawler/parser.ts`
- 调度计算：`lib/catalog-crawler/schedule.ts`
- 安全抓取：`server/catalog-crawler/safe-fetch.ts`
- 图片标准化：`server/catalog-crawler/image-store.ts`
- 扫描 / 去重 / 草稿：`server/catalog-crawler/service.ts`
- 定时器 / CLI：`server/catalog-crawler/scheduler.ts`、`scripts/crawl-catalog.ts`
- 管理 Action：`server/admin/crawler/actions.ts`
- 后台数据：`server/data/admin-crawler.ts`
- 页面：`app/admin/crawler/page.tsx`、`app/admin/crawler/drafts/[draftId]/page.tsx`
- UI：`components/admin/admin-crawler-shell.tsx`
- 草稿发布事务：`server/admin/goods/actions.ts`
- 标准图路由：`app/catalog-assets/[fileName]/route.ts`
