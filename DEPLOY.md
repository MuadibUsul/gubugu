# 部署到 VPS（GitHub Actions + Docker）

这套配置把项目以**长驻进程**部署到一台 Linux VPS：自建 Postgres + Next 网站 +
Caddy 自动 HTTPS，靠 GitHub Actions 构建镜像并 SSH 上线。

```
 push main ──▶ GitHub Actions ──▶ 构建 web / migrator 镜像 ──▶ 推到 GHCR
                                                                    │
                                            SSH 到 VPS ◀────────────┘
                                                │
                          docker compose：postgres → migrate(一次性) → web → caddy
```

## 为什么是这套

- 应用带 CLIP 识别模型（首次加载约 140s）和每日采集爬虫，**必须长驻**，不适合
  Serverless。见 [server/recognition/embedding.ts](server/recognition/embedding.ts)。
- 生产**强制 Supabase Auth**：[server/env.ts](server/env.ts) 在 `NODE_ENV=production`
  且未配 Supabase 时**拒绝启动**（否则登录会回退到无校验的演示管理员账号）。
  数据库仍是你自建的 Postgres，Supabase 只承担登录鉴权——一个免费项目即可。

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
3. **Supabase 项目**：新建一个免费项目，记下 `Project URL` 和 `anon public key`
   （Settings → API）。仅用于登录鉴权。

---

## 二、GitHub 仓库配置

镜像构建时会把 `NEXT_PUBLIC_*` 内联进客户端包，所以它们要在**构建时**就位。
公开值放 **Variables**，私密值放 **Secrets**。

### Repository → Settings → Secrets and variables → Actions

**Variables（公开，用于构建）**

| 名称 | 值 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `NEXT_PUBLIC_APP_NAME` | `Gooods Dex`（可选） |

**Secrets（私密，用于 SSH 部署）**

| 名称 | 值 |
| --- | --- |
| `VPS_HOST` | VPS IP 或主机名 |
| `VPS_USER` | SSH 用户（该用户需在 docker 组内） |
| `VPS_SSH_KEY` | 私钥全文（对应公钥已加入 VPS 的 `authorized_keys`） |
| `VPS_PORT` | SSH 端口，非 22 才填 |
| `DEPLOY_DIR` | VPS 上的部署目录，如 `/opt/gubugu` |

> GHCR 推拉用内置 `GITHUB_TOKEN`，无需额外 PAT。首次推送后，到
> Packages 页确认可见性；VPS 用同一 token 在部署时临时登录拉取。

---

## 三、VPS 首次手动准备（只做一次）

```bash
sudo mkdir -p /opt/gubugu            # 与 DEPLOY_DIR 一致
sudo chown "$USER":"$USER" /opt/gubugu
cd /opt/gubugu
```

把仓库里的 [.env.production.example](.env.production.example) 内容拷成 `/opt/gubugu/.env`，
按注释填好（域名、`POSTGRES_PASSWORD` 用强随机、Supabase 三项、`ADMIN_USER_EMAILS`
填你的登录邮箱）。`WEB_IMAGE` / `MIGRATOR_IMAGE` 两行留空——CI 会自动写入。

> `.env` 只放在 VPS 上，**永不进 git、永不经 CI**。

### 反向代理：复用宿主机已有的 Caddy（本机就是这种情况）

这台 VPS 上**已经装了 Caddy 并占用 80/443**，所以 compose 里的 `caddy` 服务默认
不启动（藏在 `bundled-caddy` profile 后面），`web` 只绑 `127.0.0.1:3000`。
在宿主机的 Caddy 配置（通常 `/etc/caddy/Caddyfile`）里追加一段：

```caddy
gubugu.tlines.tech {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
```

然后 `sudo systemctl reload caddy`。Caddy 会自动为该子域签发证书，**不影响
`tlines.tech` 上原有的站点**。

> 只有当宿主机没有任何反向代理时，才改用自带的那个：
> `docker compose --profile bundled-caddy up -d`（并把 `web` 的 `ports` 去掉）。

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

迁移只建表，库是空的。种子与识别向量按需灌入（在 VPS 的 `/opt/gubugu` 下）：

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
cd /opt/gubugu
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
  `model_cache`（模型）、`caddy_data`（证书）。删卷即丢数据，勿轻动。

---

## 七、手动部署（不走 CI 时）

在装了 Docker 的机器上，仓库根目录：

```bash
# 本机构建两个镜像
docker build --target runner   -t gubugu-web \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key .
docker build --target migrator -t gubugu-migrator .

# 让 compose 用本地镜像（.env 里）
#   WEB_IMAGE=gubugu-web
#   MIGRATOR_IMAGE=gubugu-migrator
docker compose up -d
```
