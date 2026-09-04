# 部署到 VPS（GitHub Actions + Docker）

这套配置把项目以**长驻进程**部署到一台 Linux VPS：自建 Postgres + Next 网站 +
Caddy 自动 HTTPS，靠 GitHub Actions 构建镜像并 SSH 上线。

```
 push main ──▶ GitHub Actions ──▶ 构建 web / migrator 镜像 ──▶ 推到 GHCR
                                                                    │
                                            SSH 到 VPS ◀────────────┘
                                                │
             docker compose：postgres → migrate(一次性) → web ──▶ 宿主机既有 Caddy
```

## 为什么是这套

- 应用带 CLIP 识别模型（首次加载约 140s）和每日采集爬虫，**必须长驻**，不适合
  Serverless。见 [server/recognition/embedding.ts](server/recognition/embedding.ts)。
- **认证完全自托管**，不依赖 Supabase：账号存在自建 Postgres（scrypt 口令哈希），
  会话是 HMAC 签名的 cookie，登录与注册都有限流。生产环境必须设置至少 32 位的
  `LOCAL_AUTH_SECRET`，否则 [server/env.ts](server/env.ts) 拒绝启动。
- 与此配套的两处安全收口（**改动前务必理解**）：种子里的演示账号口令
  `gubugu-demo` 硬编码在仓库中，而 [lib/admin-access.ts](lib/admin-access.ts) 曾在未配
  Supabase 时把演示账号 id 直接认成管理员。现在**生产环境**下：演示角色回退已关闭
  （管理员只认 `ADMIN_USER_EMAILS`/`ADMIN_USER_IDS`），且种子不再写入演示登录凭据。

---

## 一、前置准备

1. **VPS**：一台 Linux 服务器（建议 ≥2 vCPU / 4GB 内存，CLIP 模型吃内存），装好
   Docker 与 Compose 插件：
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
2. **域名**：本项目用子域 **`gubugu.tlines.tech`**。在 Namecheap 的 `tlines.tech`
   下加一条 A 记录：`Host=gubugu`，`Value=104.207.82.85`。放行 `80`、`443`。
   > 用子域而非顶级域，是为了避开 `tlines.tech` 上混着的 Namecheap 停放页 A 记录
   > （`156.154.132.200/133.200`）——那会让流量轮询到停放页并导致证书签发失败。

---

## 二、GitHub 仓库配置

认证自托管后，构建期不再需要任何 `NEXT_PUBLIC_*` 变量，只需配置 SSH 部署用的
Secrets（想让 CI 自动上线时才需要；手动部署可跳过整节）。

### Repository → Settings → Secrets and variables → Actions

**Secrets（私密，用于 SSH 部署）**

| 名称          | 值                                                  |
| ------------- | --------------------------------------------------- |
| `VPS_HOST`    | VPS IP 或主机名                                     |
| `VPS_USER`    | SSH 用户（该用户需在 docker 组内）                  |
| `VPS_SSH_KEY` | 私钥全文（对应公钥已加入 VPS 的 `authorized_keys`） |
| `VPS_PORT`    | SSH 端口，非 22 才填                                |
| `DEPLOY_DIR`  | VPS 上的部署目录，如 `/opt/gubugu`                  |

> GHCR 推拉用内置 `GITHUB_TOKEN`，无需额外 PAT。首次推送后，到
> Packages 页确认可见性；VPS 用同一 token 在部署时临时登录拉取。

---

## 三、VPS 首次手动准备（只做一次）

```bash
mkdir -p ~/gubugu && cd ~/gubugu     # 与 DEPLOY_DIR 一致，沿用 tline 的家目录约定
```

把仓库里的 [.env.production.example](.env.production.example) 内容拷成 `~/gubugu/.env`（权限
600），按注释填好：域名、`POSTGRES_PASSWORD` 与 `LOCAL_AUTH_SECRET` 都用
`openssl rand -base64 48` 生成，`ADMIN_USER_EMAILS` 填你的登录邮箱。
`WEB_IMAGE` / `MIGRATOR_IMAGE` 由 CI 或手动填入。

> `.env` 只放在 VPS 上，**永不进 git、永不经 CI**。

### ⚠️ 与机器上原有项目的隔离约定

本部署遵守以下硬约定，任何一条都不得为了图省事而破例。这台 VPS 上跑着 **tline**：`tline-app`、`tline-scheduler-1`、`tline-macro-scheduler-1`、
`tline-db-1`（Postgres 16），以及 `caddy-caddy-1`（`caddy:2-alpine` 容器，独占
80/443，配置来自宿主机 `/opt/caddy/Caddyfile`，只接在共享网络 `web` 上）。

| 资源       | 隔离方式                                                                                                              |
| ---------- | --------------------------------------------------------------------------------------------------------------------- |
| 容器 / 卷  | compose 项目名固定 `gubugu`，资源带 `gubugu_` 前缀；应用容器名 `gubugu-app`，与 `tline-*` 无交集                      |
| 网络       | 自有 `gubugu_internal`；只把应用接入既有的 `web`（声明为 `external`，`compose down` 不会删它）                        |
| 宿主机端口 | **一个都不占**。Caddy 经 `web` 网络用容器名直连 `gubugu-app:3000`，无需任何端口映射                                   |
| 数据库     | 自建 Postgres 只在 `gubugu_internal` 上，`web` 网络够不着；**不碰 `tline-db-1`**                                      |
| 内存       | 整机 6 GB。web 限 2560m、postgres 限 768m，避免挤垮 tline                                                             |
| 文件       | 只写 `~/gubugu`；数据在命名卷里                                                                                       |
| 镜像清理   | 只删 `gubugu-*` 的旧镜像。**绝不可用 `docker image prune -a`** —— tline 有大量按 sha 标记、未运行的镜像，会被一并删除 |

### 反向代理：给现有 Caddy 加一段站点配置

`/opt/caddy/Caddyfile` 属主是 `deploy`、可写，无需 sudo。追加：

```caddy
gubugu.tlines.tech {
	encode zstd gzip
	reverse_proxy gubugu-app:3000
}
```

先备份、再校验、最后热重载，**校验不过就别 reload**（坏配置会让 Caddy 起不来，
把 tline 一起拖下水）：

```bash
cp /opt/caddy/Caddyfile /opt/caddy/Caddyfile.bak.$(date +%F-%H%M)
docker exec caddy-caddy-1 caddy validate --config /etc/caddy/Caddyfile \
  && docker exec caddy-caddy-1 caddy reload --config /etc/caddy/Caddyfile
```

`reload` 是热重载，不中断 `tlines.tech`。Caddy 会自动为新子域签发证书。

---

## 四、上线

把改动推到 `main`（或在 Actions 页手动 `Run workflow`）：

```bash
git push origin main
```

Actions 会：构建并推两个镜像 → scp 编排文件到 `DEPLOY_DIR` → SSH 执行
`docker compose up -d`。`migrate` 服务先跑 drizzle 迁移，成功后才起 `web`，Caddy
随即为你的域名签发证书。约 1～2 分钟后访问 `https://你的域名`。

---

## 五、首次数据初始化（可选，一次性）

迁移只建表，库是空的。种子与识别向量按需灌入（在 VPS 的 `~/gubugu` 下）：

```bash
# 灌入种子数据（用 migrator 镜像，它带 tsx 与源码；共用同一个内网 DB）
docker compose run --rm migrate pnpm db:seed

# 为图鉴图片生成 CLIP 向量，识别功能才有匹配对象
docker compose run --rm migrate pnpm db:embed
```

> 中国网络下模型下载可能被墙：`.env` 里已可设 `HF_MIRROR=https://hf-mirror.com`。

---

## 六、日常运维

```bash
cd ~/gubugu
docker compose logs -f web        # 看应用日志
docker compose ps                 # 看状态与健康检查
docker compose restart web        # 重启网站
```

- **回滚**：把 `.env` 里 `WEB_IMAGE`/`MIGRATOR_IMAGE` 改回上一个 sha 标签，再
  `docker compose up -d`。GHCR 保留历史镜像。
- **数据库备份**：
  ```bash
  docker compose exec postgres pg_dump -U gubugu gubugu > backup_$(date +%F).sql
  ```
- **持久化数据**都在命名卷里：`pgdata`（库）、`catalog_assets`（爬虫图片）、
  `model_cache`（模型）。证书由宿主机既有的 Caddy 管理，不归本项目。删卷即丢数据，勿轻动。

---

## 七、手动部署（不走 CI 时）

在装了 Docker 的机器上，仓库根目录：

```bash
# 本机构建两个镜像
docker build --target runner   -t gubugu-web .
docker build --target migrator -t gubugu-migrator .

# 让 compose 用本地镜像（.env 里）
#   WEB_IMAGE=gubugu-web
#   MIGRATOR_IMAGE=gubugu-migrator
docker compose up -d
```
