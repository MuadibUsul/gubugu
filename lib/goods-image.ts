/**
 * goods_images.image_url accepts any absolute URL — server/admin/goods/actions.ts
 * validates it with z.string().url() and nothing narrows the host — while the
 * seed writes same-origin paths. next/image only accepts internal paths and
 * hosts listed in next.config.ts images.remotePatterns, so routing every URL
 * through it would stop rendering images that work today.
 *
 * Callers use this to decide: optimisable URLs go through next/image, the rest
 * fall back to a plain lazy <img>, which still avoids blocking render.
 */
export function isOptimizableImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // Same-origin path. Protocol-relative (`//host/...`) is not one of these — it
  // resolves to a remote host, so it has to pass the allowlist check below.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return true;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return false;
  }

  try {
    return new URL(trimmed).hostname === new URL(supabaseUrl).hostname;
  } catch {
    return false;
  }
}
