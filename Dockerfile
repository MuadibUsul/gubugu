# syntax=docker/dockerfile:1

# ── 说明 ─────────────────────────────────────────────────────────────────────
# 用 Debian slim（glibc）而非 Alpine：sharp 与 onnxruntime-node 依赖的预编译
# 原生二进制在 glibc 上开箱即用，musl 上常需重编。
#
# 不用 Next standalone：它的文件追踪跟不进 @huggingface/transformers 的动态
# import 及其原生依赖 onnxruntime-node，产物会缺包。改用常规 `next start` +
# 完整生产依赖，最稳。产出两个目标：
#   - runner   ：跑网站（.next 产物 + 生产依赖 + `next start`）。
#   - migrator ：带全量依赖与 drizzle 源码，一次性执行 `pnpm db:migrate`。
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ── 全量依赖（含 devDeps）：build 与迁移都要 ─────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── 仅生产依赖：给运行镜像，不含 drizzle-kit 等 devDeps ──────────────────────
FROM base AS proddeps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ── 构建 .next 产物 ──────────────────────────────────────────────────────────
FROM base AS build
# NEXT_PUBLIC_* 在 build 时被内联进客户端包，必须在这里就位（见 CI 的 build-args）。
# 它们是公开值，进镜像无妨。
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_NAME="Gooods Dex"
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ── 迁移镜像：复用 build 层（已有全量依赖 + drizzle 源码 + 配置）─────────────
FROM build AS migrator
ENV NODE_ENV=production
# drizzle.config.ts 从 DATABASE_URL 读目标库；compose 的 migrate 服务注入它。
CMD ["pnpm", "db:migrate"]

# ── 运行镜像 ─────────────────────────────────────────────────────────────────
FROM base AS runner

# Satori/resvg 渲染分享卡时会查找 fontconfig 的默认配置，缺失会持续刷警告。
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MODEL_CACHE_DIR=/app/.data/models \
    CATALOG_ASSET_DIR=/app/.data/catalog-assets

# 运行所需：生产依赖、构建产物、静态资源、配置。next start 不需要应用源码
# （已编译进 .next），但需要 next.config。
COPY --from=proddeps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

# sharp 固定在 0.33.5（见 package.json 的 pnpm.overrides）：0.34 起的预编译 linux-x64
# 二进制要求 x86-64-v2，而部署目标的 CPU 只有 v1，官方 wasm 回退又需要 Wasm SIMD
# （同样依赖 SSE4.1）。这里在构建期断言版本与可加载性，避免将来升级悄悄把线上打挂。
RUN node -e "const s=require('sharp'); const v=s.versions.sharp; if(!v.startsWith('0.33.')) throw new Error('sharp '+v+' 预编译包要求 x86-64-v2，目标 CPU 不支持；请保持 0.33.x'); console.log('sharp', v, 'ok, libvips', s.versions.vips)"

# 分享卡由 librsvg 渲染，中文字体必须让 fontconfig 能找到，否则回落到 DejaVu、
# 中文全部变成豆腐块。字体本身随 public/ 一起进镜像，这里再装进系统字体目录。
RUN mkdir -p /usr/share/fonts/opentype \
    && cp /app/public/fonts/SmileySans-Oblique.otf /usr/share/fonts/opentype/ \
    && fc-cache -f > /dev/null

# 可写目录，全部交给运行用户 node：
#  - .data 是持久卷挂载点（模型缓存、爬虫图片）；
#  - 整个 .next 都要可写：除 .next/cache（fetch cache）外，ISR 还会把 force-static
#    路由（如分享卡）的预渲染结果写回 .next/server/app/**。产物以 root 拷入，不授权
#    就会 EACCES —— 结果无法落盘，每次过期都要重算十几秒。
RUN mkdir -p /app/.data/models /app/.data/catalog-assets /app/.next/cache \
    && chown -R node:node /app/.data /app/.next

USER node
EXPOSE 3000

CMD ["pnpm", "start"]
