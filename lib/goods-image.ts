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
const defaultAppUrl = 'http://127.0.0.1:3000';

function getAppUrl() {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? defaultAppUrl;

  return configured.replace(/\/+$/, '');
}

/**
 * Resolves a stored image URL to an absolute one.
 *
 * goods_images.image_url holds same-origin paths for seeded data and absolute
 * URLs for anything uploaded, but the recognition response schema requires
 * absolute URLs — a relative path fails validation and takes the whole request
 * down with it.
 */
export function toAbsoluteImageUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `${getAppUrl()}${trimmed}`;
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    return null;
  }
}

export function isOptimizableImageUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return false;
  }

  // app/demo-assets/[...asset]/route.ts is a placeholder generator, not a file
  // server: every path under it returns a generated SVG whatever the extension
  // says. next/image refuses to optimise SVG unless dangerouslyAllowSVG is set,
  // and it decides by the URL suffix — so a demo asset ending in .jfif gets sent
  // to the optimiser and comes back 400, leaving a blank card.
  if (trimmed.startsWith('/demo-assets/')) {
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
