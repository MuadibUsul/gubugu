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

# 目标 VPS 的 CPU 是 QEMU 通用型号，只有 x86-64-v1，而 sharp 的 linux-x64 预编译包
# 要求 v2。sharp 的加载器会先 require 到 linux-x64 包并 break 出候选循环，之后才做
# v2 自检并把结果置空，因此不会自动回退——必须让这个绑定根本不存在，加载器才会在
# 它上面拿到 MODULE_NOT_FOUND 继续往下，落到 @img/sharp-wasm32（sharp 官方为不受
# 支持的 CPU 提供的 WebAssembly 版本，由 package.json 的 supportedArchitectures 装入）。
# 等价于 sharp 文档里的 `npm install --cpu=wasm32 sharp`。
RUN rm -rf node_modules/.pnpm/sharp@*/node_modules/@img/sharp-linux-x64 \
    && ! ls -d node_modules/.pnpm/sharp@*/node_modules/@img/sharp-linux-x64 > /dev/null 2>&1 \
    && node -e "require('sharp'); console.log('sharp loaded via wasm32')"

# 持久卷挂载点（模型缓存、爬虫图片），先建好并交给 node 用户以保证可写。
RUN mkdir -p /app/.data/models /app/.data/catalog-assets \
    && chown -R node:node /app/.data

USER node
EXPOSE 3000

CMD ["pnpm", "start"]
