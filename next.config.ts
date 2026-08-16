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
  images: {
    remotePatterns: buildRemoteImagePatterns(),
  },
  experimental: {
    // server/auth/admin.ts 用 forbidden() 拦截权限不足的访问，app/forbidden.tsx
    // 是它的渲染目标。这个开关不打开时 forbidden() 直接抛错，后台页面会变成
    // 500 而不是 403 —— 拦截仍然生效，但呈现给用户的是崩溃。
    authInterrupts: true,
  },
};

export default nextConfig;
