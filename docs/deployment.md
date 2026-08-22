# Deployment

生产部署手册。本文只描述已经在仓库里验证过的行为，没有实现的能力会明确标注。

## 1. 上线前必须知道的三件事

### 识别功能需要常驻进程

识别已接入真实的 CLIP 图像向量匹配（见 `docs/recognition-options.md`）。**模型冷加载实测约 142 秒**，热态单图推理 60–90ms。

部署方案为自建服务器，因此模型可以直接活在主应用进程里，142 秒只在服务启动时付一次，不需要把识别接口拆出去。**这也是不能用 serverless 的原因** —— 那种形态下每次冷启动都要重新付这个代价。

长驻服务器可设置 `RECOGNITION_WARMUP=1`。启动会等待模型完成加载，避免第一个真实请求承担冷启动；本地开发默认关闭。

上线前必须运行 `pnpm db:embed` 给图鉴图片建索引。没有索引时识别会降级到占位结果，界面会明确标注为「占位结果 · 非真实识别」，不会伪装成真实匹配。

### 生产环境不配 Supabase 会拒绝启动

`server/env.ts` 由 `instrumentation.ts` 在服务启动时加载。当 `NODE_ENV=production` 时，缺少 `DATABASE_URL` 或 Supabase 配置会直接抛错，服务起不来。

这是有意为之。本地可使用 PostgreSQL 账号表、scrypt 密码哈希和签名 HttpOnly Cookie；生产仍强制 Supabase Auth，以便使用邮箱验证、密码找回和集中会话管理。

### 数据库连接池

`server/db/client.ts` 现在在所有环境缓存连接池。早期版本只在非生产环境缓存，导致生产下每次 `getDb()`（全仓库 38 处调用）都新建一个 `pg.Pool` 且从不释放，连接数会迅速打满。`server/db/client.test.ts` 锁住了这个不变式，不要改回去。

## 2. 环境变量

`server/env.ts` 校验下列变量。生产环境缺失会导致启动失败。

| 变量                            | 生产必需     | 说明                                                       |
| ------------------------------- | ------------ | ---------------------------------------------------------- |
| `DATABASE_URL`                  | 是           | 缺失时所有数据模块回退到空状态，站点会渲染空图鉴并返回 200 |
| `NEXT_PUBLIC_SUPABASE_URL`      | 是           | 必须与 anon key 同时配置，只配一半会被校验拦下             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是           | 同上                                                       |
| `SUPABASE_SERVICE_ROLE_KEY`     | 否           | 预留，当前没有任何代码读取                                 |
| `NEXT_PUBLIC_APP_NAME`          | 否           | 站点名                                                     |
| `APP_URL`                       | 是           | canonical、社交分享卡和同源图片；必须是纯公开 HTTPS origin |
| `LOCAL_AUTH_SECRET`             | 本地认证时   | 至少 32 位，用于签名本地会话 Cookie                        |
| `RECOGNITION_WARMUP`            | 否           | 长驻服务器设为 `1` 时在启动阶段预热识别模型                |
| `CATALOG_CRAWLER_SCHEDULER`     | 否           | 长驻进程默认 `1`，北京时间 10:00 / 22:00 自动采集          |
| `CATALOG_ASSET_DIR`             | 否           | 采集标准图目录，默认 `.data/catalog-assets`，生产需持久化  |
| `ADMIN_USER_EMAILS`             | **实际必需** | 见下方说明                                                 |
| `ADMIN_USER_IDS`                | 否           | 与上一项二选一即可                                         |
| `MODERATOR_USER_EMAILS`         | 否           | 审核员允许名单                                             |
| `MODERATOR_USER_IDS`            | 否           | 同上                                                       |

### 管理员允许名单不能不配

`lib/admin-access.ts` 的演示账号兜底只在**未配置 Supabase** 时生效。生产环境配了 Supabase，这条兜底被跳过，管理员身份完全来自 `ADMIN_USER_EMAILS` / `ADMIN_USER_IDS`。

**两者都不配 = 没有任何人能进 `/admin`**，包括你自己。邮箱匹配不区分大小写，逗号分隔。

### `NEXT_PUBLIC_SUPABASE_URL` 必须在构建时就存在

`next.config.ts` 的 `buildRemoteImagePatterns()` 在**构建期**读取这个变量来生成 `images.remotePatterns`。构建时缺失会生成空白名单，运行时再补环境变量也没用 —— `next/image` 会拒绝所有 Supabase Storage 上的远程图片。

在托管平台上要确保该变量对 **Build 阶段**可见，不能只配 Runtime。改这个变量后必须重新构建，仅重启无效。

### `APP_URL` 必须是公开 HTTPS origin

SKU 分享卡、canonical 和 Open Graph 图片都使用该 server-only origin。生产环境缺失、使用 HTTP，或包含账号、路径、查询参数、片段时都会拒绝启动。不要改成 `NEXT_PUBLIC_APP_URL`：Next.js 会在构建时内联 `NEXT_PUBLIC_*`，可能把 localhost 永久写进生产产物。本地开发无需配置，默认使用 `http://127.0.0.1:3000`。只有本机执行 `pnpm start` 冒烟测试时，可同时设置 `APP_URL=http://127.0.0.1:3000` 与 `ALLOW_INSECURE_LOCAL_APP_URL=1`；该开关只接受 loopback，部署环境禁止启用。

## 3. Supabase 项目准备

以下步骤需要在 Supabase 控制台手动完成，不能由仓库脚本代劳。

1. 创建项目，记录 Project URL 和 anon key。
2. 创建 Storage bucket，名称默认 `goods-community`（可用 `NEXT_PUBLIC_SUPABASE_GOODS_COMMUNITY_BUCKET` 覆盖，见 `lib/supabase/storage.ts`）。
3. **该 bucket 必须设为 public。** `server/community/actions.ts:313` 用 `getPublicUrl()` 生成图片地址，私有 bucket 会返回无法访问的 URL。
4. 上传限制在代码里是 4 张 / 单张 5 MB（`goodsCommunityUploadLimits`）。Supabase 侧的限制建议不低于此值。
5. 配置 Auth：启用需要的登录方式，并把回调地址指向 `<你的域名>/auth/callback`。

## 4. 数据库迁移

```bash
DATABASE_URL="<生产连接串>" pnpm db:migrate
```

注意事项：

- **迁移要走直连（5432），不要走连接池（6543）。** 事务模式的 pooler 不支持迁移需要的会话级语句。
- 运行时连接则相反，serverless 环境应当使用 pooler 连接串。
- `pnpm db:seed` 灌的是演示数据（`drizzle/seed/`），**不要对生产库执行**。
- `0008_guarded_row_level_security.sql` 在检测到 Supabase 自带的 `auth.uid()` 时不会重复创建，可以安全地对 Supabase 执行。

### 关于 RLS

RLS 策略已经启用，但**当前不在请求路径上**。应用通过 `DATABASE_URL` 以表 owner 身份连接，而 owner 会绕过 RLS（除非设置 `FORCE ROW LEVEL SECURITY`）。

这些策略是为将来 iOS 瘦客户端直连 Supabase 时准备的。也就是说：**当前的访问控制完全由 `server/` 里的应用层代码负责**，不要以为 RLS 已经在保护数据。

`pnpm db:verify-rls` 可以验证策略本身是否正确，它会创建一个 `app_client` 角色来模拟 anon/authenticated。

## 5. 托管：自建服务器

部署方案为自建服务器上的常驻 Node 进程。这个选择由识别功能决定 —— 见第 1 节。

仓库里还**没有** `Dockerfile`，也没在 `next.config.ts` 里设置 `output: 'standalone'`。容器化之前需要补这两样。

自建需要注意的点：

- **`NEXT_PUBLIC_SUPABASE_URL` 必须在构建阶段就存在**，理由见第 2 节。容器化时要作为构建参数传入，只在运行时注入无效。
- 进程要有守护（systemd / PM2 / 容器重启策略）。识别的模型单例存在进程内存里，进程重启就要重新加载。
- 模型权重首次会从 `huggingface.co` 下载并缓存。服务器若通过代理出网，Node 的 fetch 默认不读代理变量，需要 `NODE_USE_ENV_PROXY=1`。**离线服务器需要预先把模型缓存目录一起部署上去。**
- 内存要留够 ONNX 运行时和模型常驻的量。
- `DATABASE_URL` 直连即可，不需要 Vercel 那种 serverless 的 pooler 考量。连接池由 `server/db/client.ts` 在进程内复用。
- 采集器默认随长驻进程调度。`.data/catalog-assets` 必须挂载持久磁盘；多实例需使用共享磁盘或对象存储。完整说明见 `docs/catalog-crawler.md`。

> 注：本文档早前版本按 Vercel 编写。改为自建后，原先「把识别拆成独立服务」的要求不再需要。

## 6. 上线检查表

构建与测试：

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] 分支已合入 `main` 并跑过完整 CI

数据库：

- [ ] 生产库已执行 `pnpm db:migrate`（走直连）
- [ ] 确认**没有**对生产库跑过 `pnpm db:seed`

Supabase：

- [ ] Storage bucket 已创建且为 public
- [ ] Auth 回调地址已指向生产域名

环境变量：

- [ ] `DATABASE_URL`、`APP_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 均已配置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 在 Build 阶段可见
- [ ] `ADMIN_USER_EMAILS` 或 `ADMIN_USER_IDS` 已配置，否则无人能进后台

上线后验证：

- [ ] 首页、搜索、SKU 详情页能正常渲染出数据（不是空图鉴）
- [ ] 生产登录走真实 Supabase，本地登录走 PostgreSQL 账号表
- [ ] 商品图片正常显示（验证 `remotePatterns` 生效）
- [ ] 社区上传能成功并返回可访问的图片地址
- [ ] `/admin` 对允许名单内的账号可访问，对普通账号返回 403
- [ ] 观察数据库连接数是否稳定，不随请求量单调上涨
- [ ] `/admin/crawler` 可添加白名单、手动扫描并生成待审核草稿
- [ ] `CATALOG_ASSET_DIR` 在重启或重新部署后仍保留标准化图片
- [ ] 10:00 / 22:00 调度由长驻进程或外部平台任务二选一负责，未重复启用

识别：

- [ ] 已运行 `pnpm db:embed` 建立图鉴图像索引
- [ ] 长驻服务已按需要设置 `RECOGNITION_WARMUP=1`
- [ ] 抽查识别结果的来源标签是「图像特征匹配」而非「占位结果」
- [ ] 服务器能访问 `huggingface.co`，或已预置模型缓存目录

已知未解决：

- [ ] 仓库缺 `Dockerfile` 与 `next.config.ts` 的 `output: 'standalone'`，容器化前需补
