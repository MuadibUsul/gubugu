import 'server-only';

import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { domainToASCII } from 'node:url';

export const CRAWLER_HTML_MAX_BYTES = 2 * 1024 * 1024;
export const CRAWLER_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export type SafeFetchKind = 'html' | 'image' | 'json';

export type SafeFetchResult = {
  url: string;
  status: number;
  contentType: string;
  buffer: Buffer;
};

export type HostResolver = (hostname: string) => Promise<readonly string[]>;

export type SafeFetchOptions = {
  allowedHosts: readonly string[];
  kind?: SafeFetchKind;
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
  resolveHost?: HostResolver;
};

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

function parseIpv4(address: string) {
  const octets = address.split('.').map(Number);
  return octets.length === 4 &&
    octets.every((octet) => octet >= 0 && octet <= 255)
    ? octets
    : null;
}

function isPublicIpv4(address: string) {
  const octets = parseIpv4(address);
  if (!octets) return false;

  const [a, b, c] = octets;
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function expandIpv6(address: string) {
  let source = address.toLowerCase();
  const lastColon = source.lastIndexOf(':');

  if (source.includes('.')) {
    const ipv4 = parseIpv4(source.slice(lastColon + 1));
    if (!ipv4) return null;
    source = `${source.slice(0, lastColon)}:${(
      (ipv4[0] << 8) |
      ipv4[1]
    ).toString(16)}:${((ipv4[2] << 8) | ipv4[3]).toString(16)}`;
  }

  const halves = source.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;

  const segments = [
    ...left,
    ...Array.from({ length: missing }, () => '0'),
    ...right,
  ].map((segment) => Number.parseInt(segment || '0', 16));

  return segments.length === 8 &&
    segments.every((segment) => Number.isInteger(segment) && segment <= 0xffff)
    ? segments
    : null;
}

function isPublicIpv6(address: string) {
  const segments = expandIpv6(address);
  if (!segments) return false;

  const isMappedIpv4 =
    segments.slice(0, 5).every((segment) => segment === 0) &&
    segments[5] === 0xffff;
  if (isMappedIpv4) {
    return isPublicIpv4(
      `${segments[6] >> 8}.${segments[6] & 255}.${segments[7] >> 8}.${segments[7] & 255}`,
    );
  }

  // Public unicast space only; explicit exclusions cover transition and docs ranges.
  return !(
    segments[0] < 0x2000 ||
    segments[0] > 0x3fff ||
    (segments[0] === 0x2001 && segments[1] === 0) ||
    (segments[0] === 0x2001 && segments[1] === 0x0db8) ||
    segments[0] === 0x2002
  );
}

export function isPublicIpAddress(address: string) {
  const value = address.split('%')[0];
  const family = isIP(value);
  return family === 4
    ? isPublicIpv4(value)
    : family === 6
      ? isPublicIpv6(value)
      : false;
}

function normaliseHost(host: string) {
  const trimmed = host.trim().toLowerCase().replace(/\.$/, '');
  const unwrapped =
    trimmed.startsWith('[') && trimmed.endsWith(']')
      ? trimmed.slice(1, -1)
      : trimmed;
  return isIP(unwrapped) ? unwrapped : domainToASCII(unwrapped);
}

const defaultResolveHost: HostResolver = async (hostname) => {
  if (isIP(hostname)) return [hostname];
  return (await lookup(hostname, { all: true, verbatim: true })).map(
    ({ address }) => address,
  );
};

export async function assertSafeCrawlerUrl(
  input: string | URL,
  allowedHosts: readonly string[],
  resolveHost: HostResolver = defaultResolveHost,
) {
  const url = new URL(input);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Crawler URLs must use HTTP or HTTPS.');
  }
  if (url.username || url.password) {
    throw new Error('Crawler URLs cannot contain credentials.');
  }
  if (url.port) {
    throw new Error('Crawler URLs must use the protocol default port.');
  }

  const hostname = normaliseHost(url.hostname);
  const allowlist = new Set(allowedHosts.map(normaliseHost).filter(Boolean));
  if (!hostname || !allowlist.has(hostname)) {
    throw new Error(
      `Host is not on this crawler source allowlist: ${hostname}`,
    );
  }

  const addresses = await resolveHost(hostname);
  if (
    addresses.length === 0 ||
    addresses.some((address) => !isPublicIpAddress(address))
  ) {
    throw new Error(
      `Host resolves to a private or reserved address: ${hostname}`,
    );
  }

  return url;
}

function validateContentType(kind: SafeFetchKind, value: string | null) {
  const contentType = value?.split(';')[0].trim().toLowerCase() ?? '';

  if (
    kind === 'html' &&
    contentType !== 'text/html' &&
    contentType !== 'application/xhtml+xml'
  ) {
    throw new Error(
      `Expected an HTML response, received ${contentType || 'no content type'}.`,
    );
  }

  // JSON APIs are inconsistent about their content type: some serve
  // `application/json`, others `text/json`, and a few (e.g. the mihoyogift
  // mall API) mislabel JSON as `text/plain`. Accept all three; the caller
  // parses the body and surfaces any malformed JSON.
  if (
    kind === 'json' &&
    contentType !== 'application/json' &&
    contentType !== 'text/json' &&
    contentType !== 'text/plain'
  ) {
    throw new Error(
      `Expected a JSON response, received ${contentType || 'no content type'}.`,
    );
  }

  if (
    kind === 'image' &&
    !/^image\/(?:avif|gif|jpeg|png|tiff|webp)$/.test(contentType)
  ) {
    throw new Error(
      `Expected a raster image, received ${contentType || 'no content type'}.`,
    );
  }

  return contentType;
}

async function readLimitedBody(response: Response, maxBytes: number) {
  const advertisedLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(advertisedLength) && advertisedLength > maxBytes) {
    throw new Error(`Crawler response exceeds the ${maxBytes}-byte limit.`);
  }
  if (!response.body) return Buffer.alloc(0);

  const chunks: Uint8Array[] = [];
  const reader = response.body.getReader();
  let byteLength = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > maxBytes) {
      await reader.cancel();
      throw new Error(`Crawler response exceeds the ${maxBytes}-byte limit.`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, byteLength);
}

export async function safeFetch(
  input: string | URL,
  options: SafeFetchOptions,
): Promise<SafeFetchResult> {
  const kind = options.kind ?? 'html';
  const maxBytes =
    options.maxBytes ??
    (kind === 'image' ? CRAWLER_IMAGE_MAX_BYTES : CRAWLER_HTML_MAX_BYTES);
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 3;
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let currentUrl = new URL(input);

    for (let redirectCount = 0; ; redirectCount += 1) {
      currentUrl = await assertSafeCrawlerUrl(
        currentUrl,
        options.allowedHosts,
        options.resolveHost,
      );

      const headers: Record<string, string> = {
        Accept:
          kind === 'image'
            ? 'image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.8'
            : kind === 'json'
              ? 'application/json,text/plain;q=0.9'
              : 'text/html,application/xhtml+xml;q=0.9',
        'User-Agent': 'GubuguCatalogCrawler/1.0',
      };
      // Image servers commonly use hotlink protection (a same-site Referer
      // check) and 403 image requests without one. Send a same-origin Referer
      // for images, mirroring how a browser loads an in-page image, so a
      // page's own artwork is not rejected. HTML requests send none.
      if (kind === 'image') {
        headers.Referer = `${currentUrl.origin}/`;
      }

      const response = await fetchImpl(currentUrl, {
        cache: 'no-store',
        headers,
        redirect: 'manual',
        signal: controller.signal,
      });

      if (redirectStatuses.has(response.status)) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location)
          throw new Error('Crawler redirect has no Location header.');
        if (redirectCount >= maxRedirects) {
          throw new Error(`Crawler exceeded ${maxRedirects} redirects.`);
        }
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Crawler request failed with HTTP ${response.status}.`);
      }

      const contentType = validateContentType(
        kind,
        response.headers.get('content-type'),
      );
      const buffer = await readLimitedBody(response, maxBytes);

      return {
        url: currentUrl.toString(),
        status: response.status,
        contentType,
        buffer,
      };
    }
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeFetchText(
  input: string | URL,
  options: Omit<SafeFetchOptions, 'kind'>,
) {
  const result = await safeFetch(input, { ...options, kind: 'html' });
  return { ...result, text: new TextDecoder().decode(result.buffer) };
}

export async function safeFetchBuffer(
  input: string | URL,
  options: Omit<SafeFetchOptions, 'kind'>,
) {
  return safeFetch(input, { ...options, kind: 'image' });
}

export async function safeFetchJson<T = unknown>(
  input: string | URL,
  options: Omit<SafeFetchOptions, 'kind'>,
): Promise<{ url: string; status: number; json: T }> {
  const result = await safeFetch(input, { ...options, kind: 'json' });
  const text = new TextDecoder().decode(result.buffer);
  return {
    url: result.url,
    status: result.status,
    json: JSON.parse(text) as T,
  };
}
