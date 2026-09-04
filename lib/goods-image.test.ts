import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { isOptimizableImageUrl, toSafeShareImageUrl } from './goods-image';

let previousAppUrl: string | undefined;
let previousLegacyAppUrl: string | undefined;

beforeEach(() => {
  previousAppUrl = process.env.APP_URL;
  previousLegacyAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  process.env.APP_URL = 'https://gubugu.example';
  delete process.env.NEXT_PUBLIC_APP_URL;
});

afterEach(() => {
  if (previousAppUrl === undefined) {
    delete process.env.APP_URL;
  } else {
    process.env.APP_URL = previousAppUrl;
  }

  if (previousLegacyAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL;
  } else {
    process.env.NEXT_PUBLIC_APP_URL = previousLegacyAppUrl;
  }
});

describe('toSafeShareImageUrl', () => {
  it('allows same-origin paths and the exact configured app origin', () => {
    expect(toSafeShareImageUrl('/local-sample-images/a.jpg')).toBe(
      'https://gubugu.example/local-sample-images/a.jpg',
    );
    expect(
      toSafeShareImageUrl(
        'https://gubugu.example/demo-assets/goods/example.svg',
      ),
    ).toBe('https://gubugu.example/demo-assets/goods/example.svg');
  });

  // 图片只由本站自有域提供，不存在任何第三方图床来源。
  it('rejects remote origins outright', () => {
    expect(
      toSafeShareImageUrl(
        'https://cdn.example.net/storage/v1/object/public/goods/a.png',
      ),
    ).toBeNull();
    expect(toSafeShareImageUrl('https://cdn.example.com/a.png')).toBeNull();
  });

  it.each([
    'http://project.supabase.co/storage/v1/object/public/goods/a.png',
    'https://cdn.example.net:444/storage/v1/object/public/goods/a.png',
    'https://user:secret@project.supabase.co/storage/v1/object/public/a.png',
    'https://cdn.example.com/a.png',
    'https://gubugu.example/api/v1/collection',
    '/api/v1/collection',
    '/local-sample-images/%2e%2e/api/v1/collection',
    '/local-sample-images/%252e%252e/api/v1/collection',
    'https://cdn.example.net/storage/v1/object/public/%2e%2e/%2e%2e/rest/v1/private-table',
    '//project.supabase.co/storage/v1/object/public/a.png',
    'http://[bad',
  ])('rejects untrusted server fetch target %s', (url) => {
    expect(toSafeShareImageUrl(url)).toBeNull();
  });
});

describe('isOptimizableImageUrl', () => {
  it('accepts a same-origin path, which is what the seed writes', () => {
    expect(isOptimizableImageUrl('/local-sample-images/a.jpg')).toBe(true);
  });

  // The demo-assets route generates an SVG for any path it is given, so a
  // demo asset whose URL ends in .jfif slips past next/image's suffix-based
  // SVG check and comes back 400 from the optimiser.
  it('rejects demo assets, which are always generated SVG', () => {
    expect(
      isOptimizableImageUrl('/demo-assets/local-sample-images/a.jfif'),
    ).toBe(false);
    expect(
      isOptimizableImageUrl('/demo-assets/neon-requiem/goods/x/front.svg'),
    ).toBe(false);
  });

  it('rejects absolute URLs, since no remote host is allowlisted', () => {
    expect(
      isOptimizableImageUrl(
        'https://cdn.example.net/storage/v1/object/public/goods/a.png',
      ),
    ).toBe(false);
  });

  it('rejects another host, which next/image would refuse to render', () => {
    expect(isOptimizableImageUrl('https://cdn.example.com/a.png')).toBe(false);
  });

  // `//cdn.example.com/a.png` starts with a slash but resolves to a remote
  // host, so it must not be mistaken for a same-origin path.
  it('rejects a protocol-relative URL', () => {
    expect(isOptimizableImageUrl('//cdn.example.com/a.png')).toBe(false);
  });

  it('rejects a malformed URL instead of throwing', () => {
    expect(isOptimizableImageUrl('http://[bad')).toBe(false);
  });

  it.each([null, undefined, '', '   '])('rejects %p', (value) => {
    expect(isOptimizableImageUrl(value)).toBe(false);
  });

  it('rejects every remote host', () => {
    expect(isOptimizableImageUrl('https://cdn.example.net/storage/a.png')).toBe(
      false,
    );
    // Same-origin paths stay optimisable — they never needed the allowlist.
    expect(isOptimizableImageUrl('/local-sample-images/a.jpg')).toBe(true);
  });
});
