export type ParsedCatalogProduct = {
  sourceUrl: string;
  externalId: string | null;
  name: string;
  description: string | null;
  skuCode: string | null;
  goodsType: string | null;
  material: string | null;
  sizeLabel: string | null;
  edition: string | null;
  releaseDate: string | null;
  msrpAmount: string | null;
  currencyCode: string | null;
  manufacturer: string | null;
  imageUrls: string[];
  rawPayload: Record<string, unknown>;
};

export type ParsedCatalogPage = {
  products: ParsedCatalogProduct[];
  detailUrls: string[];
};

type JsonRecord = Record<string, unknown>;

const attributePattern =
  /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function compactText(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

function parseAttributes(source: string) {
  const attributes = new Map<string, string>();

  for (const match of source.matchAll(attributePattern)) {
    attributes.set(
      match[1].toLowerCase(),
      decodeHtml(match[2] ?? match[3] ?? match[4] ?? ''),
    );
  }

  return attributes;
}

function decodeHtml(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(
    /&(#x[0-9a-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
    (_, entity: string) => {
      if (entity[0] !== '#') return named[entity.toLowerCase()] ?? _;

      const radix = entity[1]?.toLowerCase() === 'x' ? 16 : 10;
      const digits = radix === 16 ? entity.slice(2) : entity.slice(1);
      const codePoint = Number.parseInt(digits, radix);

      try {
        return Number.isSafeInteger(codePoint)
          ? String.fromCodePoint(codePoint)
          : _;
      } catch {
        return _;
      }
    },
  );
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = compactText(value);
    if (text) return text;
  }

  return null;
}

function namedValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const name = namedValue(item);
      if (name) return name;
    }
    return null;
  }

  return isRecord(value)
    ? firstText(value.name, value.legalName, value.value)
    : compactText(value);
}

function resolveHttpUrl(value: unknown, baseUrl: URL) {
  const text = compactText(value);
  if (!text || text.startsWith('//')) return null;

  try {
    const url = new URL(text, baseUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function imageUrls(value: unknown, baseUrl: URL): string[] {
  const values = Array.isArray(value) ? value : [value];
  const urls = new Set<string>();

  for (const item of values) {
    const candidate = isRecord(item)
      ? firstText(item.contentUrl, item.url, item.thumbnailUrl)
      : compactText(item);
    const url = resolveHttpUrl(candidate, baseUrl);
    if (url) urls.add(url);
  }

  return [...urls];
}

function jsonLdTypes(value: unknown) {
  return (Array.isArray(value) ? value : [value])
    .map((item) =>
      compactText(item)?.toLowerCase().split(/[\/#]/).filter(Boolean).at(-1),
    )
    .filter((item): item is string => Boolean(item));
}

function normaliseAmount(value: unknown) {
  const text = compactText(value);
  if (!text) return null;

  const candidate = text.match(/\d[\d,.]*/)?.[0];
  if (!candidate) return null;

  const amount = /^\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?$/.test(candidate)
    ? candidate.replaceAll(',', '')
    : candidate.replace(',', '.');

  return /^\d+(?:\.\d{1,2})?$/.test(amount) ? amount : null;
}

function normaliseCurrency(value: unknown) {
  const code = compactText(value)?.toUpperCase();
  return code && /^[A-Z]{3}$/.test(code) ? code : null;
}

function normaliseDate(value: unknown) {
  const date = compactText(value)?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (!date || Number.isNaN(Date.parse(`${date}T00:00:00.000Z`))) return null;
  return date;
}

function propertyValues(product: JsonRecord) {
  const properties = new Map<string, string>();
  const rows = Array.isArray(product.additionalProperty)
    ? product.additionalProperty
    : [product.additionalProperty];

  for (const row of rows) {
    if (!isRecord(row)) continue;
    const name = compactText(row.name)?.toLowerCase();
    const value = firstText(row.value, row.description);
    if (name && value) properties.set(name, value);
  }

  return properties;
}

function getProperty(properties: Map<string, string>, names: string[]) {
  for (const name of names) {
    const value = properties.get(name);
    if (value) return value;
  }
  return null;
}

function firstOffer(value: unknown) {
  const offers = Array.isArray(value) ? value : [value];
  return offers.find(isRecord) ?? null;
}

function parseProduct(
  product: JsonRecord,
  pageUrl: URL,
): ParsedCatalogProduct | null {
  const name = firstText(product.name, product.headline);
  if (!name) return null;

  const offer = firstOffer(product.offers);
  const properties = propertyValues(product);
  const skuCode = firstText(product.sku, product.mpn, product.productID);
  const sourceUrl = resolveHttpUrl(product.url, pageUrl) ?? pageUrl.toString();

  return {
    sourceUrl,
    externalId: firstText(
      product.productID,
      product.gtin14,
      product.gtin13,
      product.gtin12,
      product.gtin8,
      product.mpn,
      product.sku,
    ),
    name,
    description: compactText(product.description),
    skuCode,
    goodsType:
      firstText(product.category) ??
      getProperty(properties, [
        'goods type',
        'product type',
        '商品类型',
        '種類',
      ]),
    material:
      firstText(product.material) ??
      getProperty(properties, ['material', 'materials', '材质', '素材']),
    sizeLabel:
      namedValue(product.size) ??
      getProperty(properties, ['size', 'dimensions', '尺寸', 'サイズ']),
    edition:
      firstText(product.model) ??
      getProperty(properties, ['edition', 'version', '版本', '仕様']),
    releaseDate: normaliseDate(product.releaseDate ?? product.datePublished),
    msrpAmount: normaliseAmount(offer?.price ?? product.price),
    currencyCode: normaliseCurrency(
      offer?.priceCurrency ?? product.priceCurrency,
    ),
    manufacturer: namedValue(product.manufacturer ?? product.brand),
    imageUrls: imageUrls(product.image, pageUrl),
    rawPayload: product,
  };
}

function itemUrl(item: unknown, pageUrl: URL) {
  if (typeof item === 'string') return resolveHttpUrl(item, pageUrl);
  if (!isRecord(item)) return null;

  if (typeof item.item === 'string') return resolveHttpUrl(item.item, pageUrl);
  if (isRecord(item.item)) {
    return resolveHttpUrl(item.item.url ?? item.item['@id'], pageUrl);
  }

  return resolveHttpUrl(item.url ?? item['@id'], pageUrl);
}

function collectJsonLd(
  value: unknown,
  pageUrl: URL,
  products: ParsedCatalogProduct[],
  detailUrls: Set<string>,
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonLd(item, pageUrl, products, detailUrls);
    }
    return;
  }

  if (!isRecord(value)) return;

  const types = jsonLdTypes(value['@type']);
  if (types.includes('product')) {
    const parsed = parseProduct(value, pageUrl);
    if (parsed) products.push(parsed);
  }

  if (types.includes('itemlist') && Array.isArray(value.itemListElement)) {
    for (const item of value.itemListElement) {
      const url = itemUrl(item, pageUrl);
      if (url && new URL(url).origin === pageUrl.origin) detailUrls.add(url);

      if (isRecord(item)) {
        collectJsonLd(item.item ?? item, pageUrl, products, detailUrls);
      }
    }
  }

  if (value['@graph']) {
    collectJsonLd(value['@graph'], pageUrl, products, detailUrls);
  }
}

function parseJsonLd(
  html: string,
  pageUrl: URL,
  products: ParsedCatalogProduct[],
  detailUrls: Set<string>,
) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const attributes = parseAttributes(match[1]);
    if (
      attributes.get('type')?.split(';')[0].trim().toLowerCase() !==
      'application/ld+json'
    ) {
      continue;
    }

    try {
      collectJsonLd(JSON.parse(match[2].trim()), pageUrl, products, detailUrls);
    } catch {
      // A malformed analytics/schema block must not discard other valid blocks.
    }
  }
}

function metaValues(html: string) {
  const values = new Map<string, string[]>();

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const key = (attributes.get('property') ?? attributes.get('name'))
      ?.trim()
      .toLowerCase();
    const content = compactText(attributes.get('content'));
    if (!key || !content) continue;

    values.set(key, [...(values.get(key) ?? []), content]);
  }

  return values;
}

function firstMeta(meta: Map<string, string[]>, ...keys: string[]) {
  for (const key of keys) {
    const value = meta.get(key)?.[0];
    if (value) return value;
  }
  return null;
}

function parseOpenGraph(html: string, pageUrl: URL) {
  const meta = metaValues(html);
  const type = firstMeta(meta, 'og:type')?.toLowerCase();
  const hasProductFields = [...meta.keys()].some((key) =>
    key.startsWith('product:'),
  );
  if (type !== 'product' && !hasProductFields) return null;

  const name = firstMeta(meta, 'og:title', 'twitter:title');
  if (!name) return null;

  const sourceUrl =
    resolveHttpUrl(firstMeta(meta, 'og:url'), pageUrl) ?? pageUrl.toString();
  const rawPayload = Object.fromEntries(meta) as Record<string, unknown>;

  return {
    sourceUrl,
    externalId: firstMeta(meta, 'product:retailer_item_id', 'product:sku'),
    name,
    description: firstMeta(meta, 'og:description', 'twitter:description'),
    skuCode: firstMeta(meta, 'product:sku', 'product:retailer_item_id'),
    goodsType: firstMeta(meta, 'product:category'),
    material: null,
    sizeLabel: null,
    edition: null,
    releaseDate: normaliseDate(firstMeta(meta, 'product:release_date')),
    msrpAmount: normaliseAmount(
      firstMeta(meta, 'product:price:amount', 'product:price'),
    ),
    currencyCode: normaliseCurrency(firstMeta(meta, 'product:price:currency')),
    manufacturer: firstMeta(meta, 'product:brand'),
    imageUrls: [
      ...(meta.get('og:image') ?? []),
      ...(meta.get('twitter:image') ?? []),
    ]
      .map((value) => resolveHttpUrl(value, pageUrl))
      .filter((value): value is string => Boolean(value)),
    rawPayload,
  } satisfies ParsedCatalogProduct;
}

function collectMatchingAnchors(
  html: string,
  pageUrl: URL,
  detailPathPattern: string,
  detailUrls: Set<string>,
) {
  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const href = parseAttributes(match[1]).get('href');
    const resolved = resolveHttpUrl(href, pageUrl);
    if (!resolved) continue;

    const url = new URL(resolved);
    if (
      url.origin === pageUrl.origin &&
      url.pathname.includes(detailPathPattern)
    ) {
      detailUrls.add(url.toString());
    }
  }
}

// ── 站点适配器 ───────────────────────────────────────────────
// 有些白名单站点在商品页只放 og:title / og:image，但 og:type 是 article（典型
// WordPress 商店），通用解析器会正确跳过。为这类站单独写小适配器，只解析它们
// 的固定结构，不引入无头浏览器。仅对明确写过适配器的站点生效。

/** NEO GATE（neogate.jp）：WordPress 商品页，og:title + 商品 slug 命名的图片。 */
function parseNeogateProduct(
  html: string,
  pageUrl: URL,
): ParsedCatalogProduct | null {
  const meta = metaValues(html);
  const rawTitle = firstMeta(meta, 'og:title', 'twitter:title');
  if (!rawTitle) return null;

  const name = rawTitle
    .replace(/\s*[|｜]\s*NEO\s*GATE\s*$/i, '')
    .replace(/が登場[！!]?\s*$/u, '')
    .trim();
  if (!name) return null;

  const slug =
    decodeURIComponent(pageUrl.pathname)
      .replace(/\/+$/, '')
      .split('/')
      .filter(Boolean)
      .pop() ?? '';

  // 商品图与页面 slug 同名前缀；-150x150 的关联文章缩略图 slug 不同，自然被排除。
  const productImages = new Set<string>();
  const ogImage = resolveHttpUrl(firstMeta(meta, 'og:image'), pageUrl);
  if (ogImage) productImages.add(ogImage);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const resolved = resolveHttpUrl(
      parseAttributes(match[0]).get('src'),
      pageUrl,
    );
    if (!resolved) continue;

    const url = new URL(resolved);
    if (url.hostname.replace(/^www\./, '') !== 'neogate.jp') continue;
    if (!url.pathname.includes('/wp-content/uploads/')) continue;

    const fileName = url.pathname.split('/').pop() ?? '';
    if (slug && fileName.startsWith(slug)) productImages.add(resolved);
  }

  return {
    sourceUrl: resolveHttpUrl(firstMeta(meta, 'og:url'), pageUrl) ?? pageUrl.toString(),
    externalId: slug || null,
    name,
    description: firstMeta(meta, 'og:description', 'twitter:description'),
    skuCode: slug ? slug.toUpperCase() : null,
    // 把商品名作为类型推断的线索（缶バッジ → can-badge 等，在 service 侧完成）。
    goodsType: name,
    material: null,
    sizeLabel: null,
    edition: null,
    releaseDate: null,
    msrpAmount: null,
    currencyCode: null,
    manufacturer: null,
    imageUrls: [...productImages],
    rawPayload: { adapter: 'neogate', title: rawTitle },
  } satisfies ParsedCatalogProduct;
}

/**
 * animate オンラインショップ（animate-onlineshop.jp）：EC 商品页 og:type=article，无 Product
 * JSON-LD，只有 BreadcrumbList。商品信息在页面内联脚本（jan_code / price / 商品コード _id2）
 * 与 og:title 中；商品图是 resize_image.php?image=<JAN>_<序号>_… 前缀，促销 banner 走
 * /upload/save_image/，关联商品用别的 JAN 前缀，都被 JAN 前缀过滤排除。
 */
function parseAnimateOnlineShopProduct(
  html: string,
  pageUrl: URL,
): ParsedCatalogProduct | null {
  const meta = metaValues(html);
  const rawTitle = firstMeta(meta, 'og:title', 'twitter:title');
  if (!rawTitle) return null;

  // 站名后缀「| アニメイト」清掉；商品名含【分类】前缀，保留给后续中文化与类型推断。
  const name = rawTitle.replace(/\s*[|｜]\s*アニメイト\s*$/u, '').trim();
  if (!name) return null;

  const jan = html.match(/jan_code:\s*'(\d+)'/)?.[1] ?? null;
  const productCode = html.match(/_id2:\s*'([\w-]+)'/)?.[1] ?? null;
  const pageId =
    decodeURIComponent(pageUrl.pathname).match(/\/pd\/(\d+)/)?.[1] ?? null;
  // new_price 不会误命中：其前一字符是 `_`（词字符），被 (?<![\w]) 排除。
  const price = html.match(/(?<![\w])price:\s*(\d+)/)?.[1] ?? null;

  // resize_image.php 的 width/height/square 只是缩放参数；归一到不带尺寸的原图 URL 再去重，
  // 只保留以本商品 JAN 开头的图，排除关联商品与促销 banner。
  const productImages = new Set<string>();
  const candidateSources = [
    firstMeta(meta, 'og:image'),
    ...[...html.matchAll(/<img\b[^>]*>/gi)].map(
      (match) => parseAttributes(match[0]).get('src') ?? null,
    ),
  ];
  for (const candidate of candidateSources) {
    const resolved = resolveHttpUrl(candidate, pageUrl);
    if (!resolved) continue;

    const url = new URL(resolved);
    if (!url.pathname.endsWith('/resize_image.php')) continue;
    const image = url.searchParams.get('image');
    if (!image) continue;
    if (jan && !image.startsWith(`${jan}_`)) continue;

    url.search = '';
    url.searchParams.set('image', image);
    productImages.add(url.toString());
  }

  return {
    sourceUrl:
      resolveHttpUrl(firstMeta(meta, 'og:url'), pageUrl) ?? pageUrl.toString(),
    externalId: jan ?? productCode ?? pageId,
    name,
    description: firstMeta(meta, 'og:description', 'twitter:description'),
    skuCode: productCode ?? jan,
    // 把商品名作为类型推断的线索（アクリルスタンド → acrylic-stand 等，在 service 侧完成）。
    goodsType: name,
    material: null,
    sizeLabel: null,
    edition: null,
    releaseDate: null,
    msrpAmount: price,
    currencyCode: price ? 'JPY' : null,
    manufacturer: null,
    imageUrls: [...productImages],
    rawPayload: { adapter: 'animate-onlineshop', title: rawTitle, jan, productCode },
  } satisfies ParsedCatalogProduct;
}

export type CatalogListing = {
  /** 商品详情页 URL（同源、去重）。只收站点认定的商品卡，不含导航 / 分页 / wp 链接。 */
  productUrls: string[];
  /** 下一页列表 URL；到末页为 null。 */
  nextPageUrl: string | null;
};

// NEO GATE 列表页路径：/products/ 与 /products/page/N/。用路径门控，避免商品页里的
// 「相关商品」card-intext-inner 卡被误当成列表（商品页也带该 class）。
function isNeogateListingPath(pathname: string) {
  const path = decodeURIComponent(pathname);
  const normalized = path.endsWith('/') ? path : `${path}/`;
  return (
    normalized === '/products/' || /^\/products\/page\/\d+\/$/.test(normalized)
  );
}

/**
 * NEO GATE（neogate.jp）商品列表页：商品卡是 <a class="card-intext-inner" href="/{slug}/">，
 * 分页是 <a class="next page-numbers" href="/products/page/N/">。只认这两类同源链接，
 * 天然排除导航、wp-json、feed、promo 等页面脏数据。
 */
function discoverNeogateListing(
  html: string,
  pageUrl: URL,
): CatalogListing | null {
  if (!isNeogateListingPath(pageUrl.pathname)) return null;

  const productUrls = new Set<string>();
  let nextPageUrl: string | null = null;

  for (const match of html.matchAll(/<a\b([^>]*)>/gi)) {
    const attributes = parseAttributes(match[1]);
    const className = attributes.get('class') ?? '';
    const resolved = resolveHttpUrl(attributes.get('href'), pageUrl);
    if (!resolved) continue;

    const url = new URL(resolved);
    if (url.hostname.replace(/^www\./, '') !== 'neogate.jp') continue;

    if (/(^|\s)card-intext-inner(\s|$)/.test(className)) {
      // 商品卡指向根路径 slug；排除列表页 / 分页自身。
      if (!isNeogateListingPath(url.pathname)) productUrls.add(url.toString());
    } else if (
      !nextPageUrl &&
      /(^|\s)next(\s|$)/.test(className) &&
      /(^|\s)page-numbers(\s|$)/.test(className)
    ) {
      nextPageUrl = url.toString();
    }
  }

  if (productUrls.size === 0) return null;
  return { productUrls: [...productUrls], nextPageUrl };
}

/** 按主机名分派「列表页发现」；只有写过列表适配器的站点返回结果。 */
export function parseCatalogListing(
  html: string,
  pageUrl: string | URL,
): CatalogListing | null {
  const url = new URL(pageUrl);
  const host = url.hostname.replace(/^www\./, '');
  if (host === 'neogate.jp') return discoverNeogateListing(html, url);
  return null;
}

/** 按主机名分派站点适配器；只有明确写过的站点返回结果。 */
function parseWithSiteAdapter(
  html: string,
  pageUrl: URL,
): ParsedCatalogProduct | null {
  const host = pageUrl.hostname.replace(/^www\./, '');
  if (host === 'neogate.jp') return parseNeogateProduct(html, pageUrl);
  if (host === 'animate-onlineshop.jp') {
    return parseAnimateOnlineShopProduct(html, pageUrl);
  }
  return null;
}

export function parseCatalogPage(
  html: string,
  pageUrl: string | URL,
  options: { detailPathPattern?: string | null } = {},
): ParsedCatalogPage {
  const baseUrl = new URL(pageUrl);
  const products: ParsedCatalogProduct[] = [];
  const detailUrls = new Set<string>();

  parseJsonLd(html, baseUrl, products, detailUrls);

  if (products.length === 0) {
    const openGraphProduct = parseOpenGraph(html, baseUrl);
    if (openGraphProduct) products.push(openGraphProduct);
  }

  // Site-specific adapters only run when generic structured data yielded nothing.
  if (products.length === 0) {
    const adapted = parseWithSiteAdapter(html, baseUrl);
    if (adapted) products.push(adapted);
  }

  const detailPathPattern = options.detailPathPattern?.trim();
  if (detailPathPattern) {
    collectMatchingAnchors(html, baseUrl, detailPathPattern, detailUrls);
  }

  const uniqueProducts = new Map<string, ParsedCatalogProduct>();
  for (const product of products) {
    const key = `${product.sourceUrl}\u0000${product.externalId ?? product.name}`;
    if (!uniqueProducts.has(key)) uniqueProducts.set(key, product);
  }

  return {
    products: [...uniqueProducts.values()],
    detailUrls: [...detailUrls],
  };
}
