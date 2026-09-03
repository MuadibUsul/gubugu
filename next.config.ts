import type { NextConfig } from 'next';

// Goods images are stored as absolute URLs in the database. Locally the seed
// writes same-origin paths, but once images come from Supabase Storage they are
// remote and next/image rejects them unless the host is allowlisted here.
function buildRemoteImagePatterns() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return [];
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    return [];
  }

  return [
    {
      protocol:
        parsedUrl.protocol === 'http:' ? ('http' as const) : ('https' as const),
      hostname: parsedUrl.hostname,
      pathname: '/storage/v1/object/public/**',
    },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 原生依赖不进 bundle，运行时从 node_modules 直接加载：sharp 与
  // onnxruntime-node（@huggingface/transformers 的依赖）带平台预编译二进制，
  // 打包会破坏它们。生产镜像保留完整依赖（见 Dockerfile / DEPLOY.md）。
  serverExternalPackages: ['@huggingface/transformers', 'sharp'],
  images: {
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
