# 部署运行时参考

本文只讲**环境变量与生产不变式**。上线步骤（VPS 准备、镜像、反向代理、数据初始化、
回滚）在仓库根目录的 [DEPLOY.md](../DEPLOY.md)，两边不重复描述同一件事，避免漂移。

## 1. 环境变量

`server/env.ts` 由 `instrumentation.ts` 在服务启动时加载并校验，生产环境缺项直接抛错、
服务起不来。这是有意为之：静默降级比启动失败更难排查。

| 变量                               | 生产必需 | 说明                                                                       |
| ---------------------------------- | -------- | -------------------------------------------------------------------------- |
| `DATABASE_URL`                     | 是       | Web 运行账号连接串；缺失或不可用时 readiness 返回 503、数据页进入 5xx 边界 |
| `APP_DATABASE_PASSWORD`            | 是       | Web 运行账号 `gubugu_app` 的独立密码；不得与迁移账号共用                   |
| `LOCAL_AUTH_SECRET`                | 是       | 至少 32 位。会话 Cookie 的 HMAC 签名密钥，泄露或过短等于任何人可伪造会话   |
| `APP_URL`                          | 是       | canonical、社交分享卡与同源图片解析；必须是无路径/查询/片段的 HTTPS origin |
| `ADMIN_USER_EMAILS`                | 实际必需 | 见下方「管理员允许名单」                                                   |
| `ADMIN_USER_IDS`                   | 否       | 与上一项二选一即可                                                         |
| `MODERATOR_USER_EMAILS/IDS`        | 否       | 审核员允许名单                                                             |
| `NEXT_PUBLIC_APP_NAME`             | 否       | 站点名，构建期内联                                                         |
| `RECOGNITION_AUTO_LIGHT_THRESHOLD` | 否       | 高置信自动点亮门槛，留空用默认 0.86；见 `pnpm recognition:evaluate`        |
| `RECOGNITION_CANDIDATE_THRESHOLD`  | 否       | 候选门槛，留空用默认 0.58；必须不高于自动点亮阈值                          |
| `RECOGNITION_WARMUP`               | 否       | 长驻服务器设 `1`，启动阶段预热 CLIP，首个真实请求不必等冷加载              |
| `CATALOG_CRAWLER_SCHEDULER`        | 否       | 长驻进程默认 `1`，北京时间 10:00 / 22:00 自动采集                          |
| `CATALOG_ASSET_DIR`                | 否       | 公开资产目录，默认 `.data/catalog-assets`，生产须挂持久卷                  |
| `USER_SCAN_ASSET_DIR`              | 否       | 私密扫描图目录，默认 `.data/user-scans`，生产须挂持久卷                    |
| `MODEL_CACHE_DIR`                  | 否       | CLIP 模型缓存，指向持久卷可免去每次重启重下约 336MB 模型                   |
| `HF_MIRROR`                        | 否       | 模型下载镜像，中国网络下设 `https://hf-mirror.com`                         |
| `DISABLE_IMAGE_OPTIMIZATION`       | 否       | 置 `1` 时图片直出，用于 sharp 不可用的 CPU；见 `next.config.mjs`           |
| `DEEPSEEK_API_KEY`                 | 否       | 采集草稿的 LLM 中文化；不配时爬虫仍产出草稿，只是保留原文                  |

## 2. 生产不变式

### 管理员允许名单不能不配

`lib/admin-access.ts` 里有一条演示账号兜底：种子中的 `collector@local.demo` 等 id 会被
直接认成管理员。**这条兜底只在非生产环境生效**，因为那些账号的口令（`gubugu-demo`）
硬编码在仓库里。生产的管理员身份完全来自 `ADMIN_USER_EMAILS` / `ADMIN_USER_IDS`。

**两者都不配 = 没有任何人能进 `/admin`**，包括你自己。邮箱匹配不区分大小写，逗号分隔。

配套地，`drizzle/seed` 在 `NODE_ENV=production` 时不写入演示登录凭据，登录页也不再
显示那行测试账号提示。两道防线彼此独立，任一生效即可。

### `APP_URL` 必须是公开 HTTPS origin

分享卡与社交预览用它拼绝对地址；写成 `http://localhost:3000` 会让所有外链指向本机。
校验拒绝非 HTTPS、带账号密码、带路径/查询/片段的形式。本地确需 `pnpm start` 冒烟测试
时，才用 `ALLOW_INSECURE_LOCAL_APP_URL=1` 放行回环地址。

### 数据库连接池必须全环境缓存

`server/db/client.ts` 在所有环境缓存连接池。早期只在非生产缓存，导致生产下每次
`getDb()`（全仓库数十处调用）都新建一个从不释放的 `pg.Pool`，连接数迅速打满。
`server/db/client.test.ts` 锁住了这个不变式，不要改回去。

### 识别需要长驻进程

CLIP 模型冷加载实测约 142 秒，热态单图 60–90ms。模型活在主应用进程里，这个代价只在
启动时付一次——**这也是不能用 serverless 的原因**。上线前须跑 `pnpm db:embed` 为图鉴
图片建索引，否则识别没有匹配对象。

### sharp 的临时安全边界

目标 VPS 只支持 x86-64-v1，暂时无法加载修复上游漏洞的 sharp 0.35.x。
`server/sharp-security.ts` 在进程启动时禁用 HEIF/AVIF、GIF、TIFF 和 VIPS 解码，
对应审计白名单中的两个 GHSA。上传边界仍只接受 JPG、PNG 和 WebP。
更换主机 CPU 后应升级 sharp，并在同一提交删除 decoder block 和 audit 例外。

### 私密资产不得进入公开区

未鉴定扫描图存在 `USER_SCAN_ASSET_DIR`，没有公开静态 URL，只能经
`/api/user-scans/[scanId]/image` 读取（要求会话、按 `user_id` 限定所有权、校验资产名
格式、对他人返回 404）。公开资产走 `CATALOG_ASSET_DIR` 与 `/catalog-assets/*`。
两者的目录、路由和缓存策略都不共用。

## 3. 数据库迁移与 RLS

迁移由 `pnpm db:migrate` 应用，schema 的唯一来源是 `drizzle/schema/`。**改了 schema 必须
跑 `pnpm db:generate`**：曾出现过 schema 增列却没有对应迁移，线上查询直接报
「column does not exist」。

RLS 策略**不在当前请求路径上**——Web 使用无 DDL 权限的
`gubugu_app` 运行角色，但在当前服务端会话模型下仍需 `BYPASSRLS`。表属主凭据
只供 migrator 使用。RLS 是为未来直连客户端准备的纵深防御，
因此需要专门的验证：`pnpm db:verify-rls` 用一个不拥有任何表的角色去实测策略是否真的
拦得住。新增任何用户数据表都必须补进这个脚本。另有 `db:verify-trade` 与
`db:verify-lighting` 覆盖换谷与点亮的不变式。

迁移中的 `auth.uid()` 是迁移 0008 自建的本地函数（`CREATE SCHEMA auth`），与外部认证
服务无关，不要因为名字相似而删改。
