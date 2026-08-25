import { describe, expect, it } from 'vitest';

import {
  isMihoyogiftSource,
  mihoyogiftDetailUrl,
  mihoyogiftListUrl,
  mihoyogiftWebUrl,
  parseSpuDetailResponse,
  parseSpuListResponse,
  shopCodeFromEntry,
} from './mihoyogift';

describe('isMihoyogiftSource', () => {
  it('识别米游铺主机（含 www 与裸域）', () => {
    expect(isMihoyogiftSource('https://www.mihoyogift.com/ys/goods?page=1')).toBe(true);
    expect(isMihoyogiftSource('https://mihoyogift.com/sr/goods')).toBe(true);
    expect(isMihoyogiftSource('https://www.animate-onlineshop.jp/x')).toBe(false);
    expect(isMihoyogiftSource('not a url')).toBe(false);
  });
});

describe('shopCodeFromEntry', () => {
  it('取路径首段为分店代码', () => {
    expect(shopCodeFromEntry('https://www.mihoyogift.com/ys/goods?categoryId=145')).toBe('ys');
    expect(shopCodeFromEntry('https://www.mihoyogift.com/sr/goods')).toBe('sr');
  });
  it('兜底看 shop_code 查询参数', () => {
    expect(shopCodeFromEntry('https://www.mihoyogift.com/?shop_code=ys')).toBe('ys');
  });
  it('取不到返回 null', () => {
    expect(shopCodeFromEntry('https://www.mihoyogift.com/')).toBeNull();
  });
});

describe('URL builders', () => {
  it('列表接口带 shop_code / order / page / limit', () => {
    const url = new URL(mihoyogiftListUrl('ys', 2, 50));
    expect(url.hostname).toBe('api-mall.mihoyogift.com');
    expect(url.pathname).toBe('/common/homeishop/v1/goods/search_goods_spu_list');
    expect(url.searchParams.get('shop_code')).toBe('ys');
    expect(url.searchParams.get('order')).toBe('comprehensive');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('50');
  });
  it('详情接口 / 网页地址', () => {
    expect(mihoyogiftDetailUrl('202108021235')).toContain(
      'get_goods_spu_detail?goods_id=202108021235',
    );
    expect(mihoyogiftWebUrl('ys', '202108021235')).toBe(
      'https://www.mihoyogift.com/ys/detail?goods_id=202108021235',
    );
  });
});

describe('parseSpuListResponse', () => {
  it('抽出 goods_id 与总数', () => {
    const json = {
      retcode: 0,
      message: 'OK',
      data: {
        list: [{ goods_id: '202108021235' }, { goods_id: '300' }, { goods_id: 42 }],
        count: 754,
      },
    };
    expect(parseSpuListResponse(json)).toEqual({
      goodsIds: ['202108021235', '300', '42'],
      count: 754,
    });
  });
  it('非成功码返回空', () => {
    expect(parseSpuListResponse({ retcode: -1, data: null })).toEqual({
      goodsIds: [],
      count: 0,
    });
    expect(parseSpuListResponse(null)).toEqual({ goodsIds: [], count: 0 });
  });
});

describe('parseSpuDetailResponse', () => {
  const detail = {
    goods_id: '202108021235',
    name: '【原神】蒙德城主题系列人物亚克力立牌 Genshin',
    cover_url: 'https://act-webstatic.mihoyo.com/upload/mall/cover.jpeg',
    main_url: [
      'https://act-webstatic.mihoyo.com/upload/mall/a.jpg',
      'https://act-webstatic.mihoyo.com/upload/mall/b.jpg',
    ],
    price: 4900,
    market_price: 4900,
    sale_time: 1779883200,
    product_material: '亚克力',
    product_producer: '米哈游',
    product_size: '高约 15cm',
    product_stage: '现货',
    desc: '蒙德城主题立牌',
  };

  it('映射为标准化产品（名称/图/价/材质/厂商/发售日）', () => {
    const product = parseSpuDetailResponse(
      { retcode: 0, data: { detail } },
      { shopCode: 'ys', goodsId: '202108021235' },
    );
    expect(product).not.toBeNull();
    expect(product!.name).toBe('【原神】蒙德城主题系列人物亚克力立牌 Genshin');
    expect(product!.externalId).toBe('mihoyogift:ys:202108021235');
    expect(product!.skuCode).toBe('MHY-YS-202108021235');
    expect(product!.sourceUrl).toBe(
      'https://www.mihoyogift.com/ys/detail?goods_id=202108021235',
    );
    // 详情大图优先，封面不掺入。
    expect(product!.imageUrls).toEqual([
      'https://act-webstatic.mihoyo.com/upload/mall/a.jpg',
      'https://act-webstatic.mihoyo.com/upload/mall/b.jpg',
    ]);
    expect(product!.msrpAmount).toBe('49.00');
    expect(product!.currencyCode).toBe('CNY');
    expect(product!.material).toBe('亚克力');
    expect(product!.manufacturer).toBe('米哈游');
    expect(product!.sizeLabel).toBe('高约 15cm');
    expect(product!.releaseDate).toBe('2026-05-27');
    // 类型线索为名称，供下游形态优先分类器判定。
    expect(product!.goodsType).toBe(product!.name);
  });

  it('main_url 为空时退回封面图', () => {
    const product = parseSpuDetailResponse(
      { retcode: 0, data: { detail: { ...detail, main_url: [] } } },
      { shopCode: 'ys', goodsId: 'x' },
    );
    expect(product!.imageUrls).toEqual([
      'https://act-webstatic.mihoyo.com/upload/mall/cover.jpeg',
    ]);
  });

  it('缺名称 / 非成功码返回 null', () => {
    expect(
      parseSpuDetailResponse(
        { retcode: 0, data: { detail: { ...detail, name: '' } } },
        { shopCode: 'ys', goodsId: 'x' },
      ),
    ).toBeNull();
    expect(
      parseSpuDetailResponse({ retcode: -1, data: null }, { shopCode: 'ys', goodsId: 'x' }),
    ).toBeNull();
  });
});
