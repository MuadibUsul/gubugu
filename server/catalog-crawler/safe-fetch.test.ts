import { describe, expect, it, vi } from 'vitest';

import {
  assertSafeCrawlerUrl,
  isPublicIpAddress,
  safeFetchBuffer,
  safeFetchText,
} from './safe-fetch';

const publicResolver = async () => ['93.184.216.34'];

describe('crawler safe fetch', () => {
  it('rejects private/reserved addresses and accepts public addresses', () => {
    expect(isPublicIpAddress('127.0.0.1')).toBe(false);
    expect(isPublicIpAddress('10.0.0.5')).toBe(false);
    expect(isPublicIpAddress('169.254.169.254')).toBe(false);
    expect(isPublicIpAddress('::1')).toBe(false);
    expect(isPublicIpAddress('fc00::1')).toBe(false);
    expect(isPublicIpAddress('::ffff:127.0.0.1')).toBe(false);
    expect(isPublicIpAddress('93.184.216.34')).toBe(true);
    expect(isPublicIpAddress('2606:4700:4700::1111')).toBe(true);
  });

  it('requires an exact allowed host and all DNS answers to be public', async () => {
    await expect(
      assertSafeCrawlerUrl(
        'https://sub.example.com/products/1',
        ['example.com'],
        publicResolver,
      ),
    ).rejects.toThrow('not on');

    await expect(
      assertSafeCrawlerUrl(
        'https://example.com/products/1',
        ['example.com'],
        async () => ['93.184.216.34', '10.0.0.5'],
      ),
    ).rejects.toThrow('private or reserved');
  });

  it('revalidates redirects and reads only bounded HTML responses', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.pathname === '/start') {
        return new Response(null, {
          status: 302,
          headers: { location: '/product/1' },
        });
      }

      return new Response('<html><title>safe</title></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }) as unknown as typeof fetch;

    const result = await safeFetchText('https://example.com/start', {
      allowedHosts: ['example.com'],
      fetchImpl,
      resolveHost: publicResolver,
      maxBytes: 100,
    });

    expect(result.url).toBe('https://example.com/product/1');
    expect(result.text).toContain('<title>safe</title>');
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await expect(
      safeFetchText('https://example.com/large', {
        allowedHosts: ['example.com'],
        fetchImpl: (async () =>
          new Response('too large', {
            headers: {
              'content-length': '1000',
              'content-type': 'text/html',
            },
          })) as typeof fetch,
        resolveHost: publicResolver,
        maxBytes: 10,
      }),
    ).rejects.toThrow('exceeds');
  });

  it('sends a same-origin Referer for images (hotlink protection) but not for HTML', async () => {
    const seen: Array<{ url: string; referer: string | undefined }> = [];
    const fetchImpl = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        const url = new URL(input instanceof Request ? input.url : input);
        const headers = new Headers(init?.headers);
        seen.push({ url: url.toString(), referer: headers.get('referer') ?? undefined });
        const contentType = url.pathname.endsWith('.webp')
          ? 'image/webp'
          : 'text/html; charset=utf-8';
        return new Response('x', { headers: { 'content-type': contentType } });
      },
    ) as unknown as typeof fetch;

    await safeFetchBuffer('https://cdn.example.com/wp-content/a.webp', {
      allowedHosts: ['cdn.example.com'],
      fetchImpl,
      resolveHost: publicResolver,
    });
    await safeFetchText('https://cdn.example.com/page', {
      allowedHosts: ['cdn.example.com'],
      fetchImpl,
      resolveHost: publicResolver,
    });

    expect(seen[0].referer).toBe('https://cdn.example.com/');
    expect(seen[1].referer).toBeUndefined();
  });
});
