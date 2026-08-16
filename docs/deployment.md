# Deployment

生产部署手册。本文只描述已经在仓库里验证过的行为，没有实现的能力会明确标注。

## 1. 上线前必须知道的三件事

### 识别功能不能跑在 serverless 上

识别已接入真实的 CLIP 图像向量匹配（见 `docs/recognition-options.md`），但**模型冷加载实测约 142 秒**。放进 serverless function 会在每次冷启动重复付出这个代价。

需要常驻 Node 进程。如果主站部署在 Vercel，识别接口要拆到独立的常驻服务上，主站转发 —— **当前代码没有做这个拆分**。

上线前还必须运行 `pnpm db:embed` 给图鉴图片建索引。没有索引时识别会降级到占位结果，界面会明确标注为「占位结果 · 非真实识别」，不会伪装成真实匹配。

### 生产环境不配 Supabase 会拒绝启动

`server/env.ts` 由 `instrumentation.ts` 在服务启动时加载。当 `NODE_ENV=production` 时，缺少 `DATABASE_URL` 或 Supabase 配置会直接抛错，服务起不来。

这是有意为之。没有这道拦截，登录会回退到 `lib/config/demo-viewers.ts` 里的演示账号 —— 不校验任何凭证，且 `collector` 直接拥有管理员权限。

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
| `NEXT_PUBLIC_APP_URL`           | 否           | 仅 `lib/demo-assets.ts` 读取，有兜底                       |
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

## 5. 托管平台

仓库里没有任何平台配置文件（无 `vercel.json` / `Dockerfile` / `fly.toml`）。Next.js 16 App Router 的默认选择是 Vercel，且与 Supabase 组合常见。

Vercel 上需要注意：

- 环境变量按第 2 节配置，`NEXT_PUBLIC_SUPABASE_URL` 记得勾选 Build 阶段可见。
- `DATABASE_URL` 使用 Supabase 的 pooler 连接串。
- 构建命令用默认的 `pnpm build` 即可，CI 已验证该命令不需要任何密钥。

若改用容器部署，需要自行添加 `Dockerfile` 并在 `next.config.ts` 中设置 `output: 'standalone'`。

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
- [ ] 运行时连接串走 pooler

Supabase：

- [ ] Storage bucket 已创建且为 public
- [ ] Auth 回调地址已指向生产域名

环境变量：

- [ ] `DATABASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 均已配置
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 在 Build 阶段可见
- [ ] `ADMIN_USER_EMAILS` 或 `ADMIN_USER_IDS` 已配置，否则无人能进后台

上线后验证：

- [ ] 首页、搜索、SKU 详情页能正常渲染出数据（不是空图鉴）
- [ ] 登录走的是真实 Supabase，而不是演示账号
- [ ] 商品图片正常显示（验证 `remotePatterns` 生效）
- [ ] 社区上传能成功并返回可访问的图片地址
- [ ] `/admin` 对允许名单内的账号可访问，对普通账号返回 403
- [ ] 观察数据库连接数是否稳定，不随请求量单调上涨

识别：

- [ ] 已运行 `pnpm db:embed` 建立图鉴图像索引
- [ ] 识别接口跑在常驻进程上，不是 serverless
- [ ] 抽查识别结果的来源标签是「图像特征匹配」而非「占位结果」

已知未解决：

- [ ] 识别接口与主站的拆分尚未实现，Vercel 部署需要自行处理
