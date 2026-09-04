// 用 .mjs 而非 .ts：`next start` 会在运行时加载本文件，若是 TypeScript 就需要
// typescript 包。它是 devDependency，生产镜像只装 --prod 依赖，Next 便会尝试在
// 运行时自行安装它，在非 root 容器里必然 EACCES 失败、应用起不来。
// JSDoc 注解保留了与原来等价的编辑器类型检查。

// Goods images are stored as absolute URLs in the database. Locally the seed
// writes same-origin paths, but once images come from Supabase Storage they are
// remote and next/image rejects them unless the host is allowlisted here.
function buildRemoteImagePatterns() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return [];
  }

  return [
    {
      protocol: parsedUrl.protocol === 'http:' ? 'http' : 'https',
      hostname: parsedUrl.hostname,
      pathname: '/storage/v1/object/public/**',
    },
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 原生依赖不进 bundle，运行时从 node_modules 直接加载：sharp 与
  // onnxruntime-node（@huggingface/transformers 的依赖）带平台预编译二进制，
  // 打包会破坏它们。生产镜像保留完整依赖（见 Dockerfile / DEPLOY.md）。
  serverExternalPackages: ['@huggingface/transformers', 'sharp'],
  images: {
    // 目标 VPS 的 CPU 只有 x86-64-v1，sharp 的原生包（要求 v2）与 wasm 包（要求
    // Wasm SIMD，同样依赖 SSE4.1）都无法加载。next/image 的优化管线正是靠 sharp，
    // 任何渲染图片的页面都会因此 500。置 1 可让图片按原样直出，整站恢复可用，代价
    // 是不再压缩/转 WebP。等宿主把 CPU 型号换成支持 v2 的型号后，去掉这个变量即可
    // 恢复优化——它在 next start 启动时读取，无需重新构建镜像。
    unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === '1',
    remotePatterns: buildRemoteImagePatterns(),
  },
  // 关掉开发模式左下角的调试指示器（那个「1 Issue」浮标），它不是 App 的一部分，
  // 会盖在底部 Tab 上；生产本就不出现。
  devIndicators: false,
  experimental: {
    // server/auth/admin.ts 用 forbidden() 拦截权限不足的访问，app/forbidden.tsx
    // 是它的渲染目标。这个开关不打开时 forbidden() 直接抛错，后台页面会变成
    // 500 而不是 403 —— 拦截仍然生效，但呈现给用户的是崩溃。
    authInterrupts: true,
  },
};

export default nextConfig;
