import type { ParsedCatalogProduct } from '@/lib/catalog-crawler/parser';

/**
 * 米哈游官方谷店（米游铺，mihoyogift.com）适配器——纯函数部分。
 *
 * 该店是 Nuxt SPA，商品数据走后端 JSON API（api-mall.mihoyogift.com），页面 HTML 里没有
 * 商品结构。所以这里不解析 HTML，而是按 shop_code 分店（原神=ys、崩坏星穹铁道=sr 等）
 * 直接调它的商品接口：列表 search_goods_spu_list 翻页拿 goods_id，详情 get_goods_spu_detail
 * 拿名称/高清图/材质/厂商/尺寸。抓取编排（翻页、节流、断点、落草稿）在 service 里，这里只做
 * URL 构造与响应解析，方便脱离网络单测。
 */

const WEB_HOST = 'www.mihoyogift.com';
const WEB_HOST_APEX = 'mihoyogift.com';
export const MIHOYOGIFT_API_HOST = 'api-mall.mihoyogift.com';
const API_BASE = `https://${MIHOYOGIFT_API_HOST}/common/homeishop/v1`;

// 商品图都托管在米哈游静态站；源站主机（www.mihoyogift.com）本身不出图，所以建源时要把
// 这些图片域名加进 allowedImageHosts，否则 buildDraftPayload 下载官图会被主机白名单挡掉。
export const MIHOYOGIFT_IMAGE_HOSTS = [
  'act-webstatic.mihoyo.com',
  'webstatic.mihoyo.com',
] as const;

// 全店翻页参数：接口用 `limit` 控制每页条数（`page_size` 不生效），`order=comprehensive`
// 对应站内「综合」排序。单店商品量以百计，取较大每页数减少请求次数。
export const MIHOYOGIFT_LIST_LIMIT = 50;

export function isMihoyogiftSource(entryUrl: string): boolean {
  try {
    const host = new URL(entryUrl).hostname.toLowerCase();
    return host === WEB_HOST || host === WEB_HOST_APEX;
  } catch {
    return false;
  }
}

/**
 * 从入口地址取分店代码。站内路径首段即 shop_code（如 /ys/goods → ys、/sr/goods → sr）；
 * 兜底再看 shop_code / shopCode 查询参数。取不到返回 null。
 */
export function shopCodeFromEntry(entryUrl: string): string | null {
  try {
    const url = new URL(entryUrl);
    const first = url.pathname.split('/').filter(Boolean)[0];
    if (first && /^[a-z0-9_-]{1,32}$/i.test(first)) return first.toLowerCase();
    const param =
      url.searchParams.get('shop_code') ?? url.searchParams.get('shopCode');
    if (param && /^[a-z0-9_-]{1,32}$/i.test(param)) return param.toLowerCase();
    return null;
  } catch {
    return null;
  }
}

export function mihoyogiftListUrl(
  shopCode: string,
  page: number,
  limit = MIHOYOGIFT_LIST_LIMIT,
): string {
  const params = new URLSearchParams({
    shop_code: shopCode,
    order: 'comprehensive',
    page: String(page),
    limit: String(limit),
  });
  return `${API_BASE}/goods/search_goods_spu_list?${params.toString()}`;
}

export function mihoyogiftDetailUrl(goodsId: string): string {
  return `${API_BASE}/goods/get_goods_spu_detail?goods_id=${encodeURIComponent(goodsId)}`;
}

// 人类可打开的商品详情页地址（用作草稿的来源链接 / 归属）。
export function mihoyogiftWebUrl(shopCode: string, goodsId: string): string {
  return `https://${WEB_HOST}/${shopCode}/detail?goods_id=${encodeURIComponent(goodsId)}`;
}

type SpuListItem = { goods_id?: unknown };
type SpuListResponse = {
  retcode?: unknown;
  data?: { list?: SpuListItem[] | null; count?: unknown } | null;
};

/** 解析列表响应：返回本页的 goods_id 数组与全店总数。非成功码返回空。 */
export function parseSpuListResponse(json: unknown): {
  goodsIds: string[];
  count: number;
} {
  const body = json as SpuListResponse;
  if (!body || body.retcode !== 0 || !body.data) {
    return { goodsIds: [], count: 0 };
  }
  const list = Array.isArray(body.data.list) ? body.data.list : [];
  const goodsIds: string[] = [];
  for (const item of list) {
    const id = item?.goods_id;
    if (typeof id === 'string' && id) goodsIds.push(id);
    else if (typeof id === 'number' && Number.isFinite(id))
      goodsIds.push(String(id));
  }
  const count =
    typeof body.data.count === 'number' ? body.data.count : goodsIds.length;
  return { goodsIds, count };
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 0 ? text : null;
}

function collectImages(detail: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (value: unknown) => {
    if (
      typeof value === 'string' &&
      /^https?:\/\//i.test(value) &&
      !out.includes(value)
    ) {
      out.push(value);
    }
  };
  // 优先详情大图（main_url，多张高清细节图），为空再退到封面图。
  const main = detail.main_url;
  if (Array.isArray(main)) for (const url of main) push(url);
  if (out.length === 0) push(detail.cover_url);
  return out;
}

// 价格以「分」为单位（4900 = ¥49.00）；仅正数才折算成金额字符串。
function priceToAmount(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return null;
  return (value / 100).toFixed(2);
}

// 开售时间是 Unix 秒；转成 YYYY-MM-DD（UTC）作为发售日期，取不到则 null。
function saleTimeToDate(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)
    return null;
  const date = new Date(value * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

type SpuDetailResponse = {
  retcode?: unknown;
  data?: { detail?: Record<string, unknown> | null } | null;
};

/**
 * 解析详情响应为标准化产品。名称本身已是「中文 … 英文后缀」，类型交由下游形态优先分类器
 * 从名称推断（故 goodsType 直接给名称作线索）。非成功码 / 无名称返回 null。
 */
export function parseSpuDetailResponse(
  json: unknown,
  context: { shopCode: string; goodsId: string },
): ParsedCatalogProduct | null {
  const body = json as SpuDetailResponse;
  const detail = body?.retcode === 0 ? body.data?.detail : null;
  if (!detail || typeof detail !== 'object') return null;

  const name = cleanText(detail.name);
  if (!name) return null;

  const { shopCode, goodsId } = context;
  const imageUrls = collectImages(detail);

  return {
    sourceUrl: mihoyogiftWebUrl(shopCode, goodsId),
    externalId: `mihoyogift:${shopCode}:${goodsId}`,
    name,
    description: cleanText(detail.desc),
    skuCode: `MHY-${shopCode.toUpperCase()}-${goodsId}`,
    // 形态优先分类器以名称为线索（名称含「亚克力立牌 / 色纸 / 挂件」等形态词）。
    goodsType: name,
    material: cleanText(detail.product_material),
    sizeLabel: cleanText(detail.product_size),
    edition: cleanText(detail.product_stage),
    releaseDate: saleTimeToDate(detail.sale_time),
    msrpAmount: priceToAmount(detail.price),
    currencyCode: 'CNY',
    manufacturer: cleanText(detail.product_producer),
    imageUrls,
    rawPayload: {
      goodsId,
      shopCode,
      productCategory: cleanText(detail.product_category),
      productMaterial: cleanText(detail.product_material),
      productProducer: cleanText(detail.product_producer),
      productSize: cleanText(detail.product_size),
      productTime: cleanText(detail.product_time),
      productStage: cleanText(detail.product_stage),
      productAuth: cleanText(detail.product_auth),
    },
  };
}
