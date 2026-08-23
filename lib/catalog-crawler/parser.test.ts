import { describe, expect, it } from 'vitest';

import { parseCatalogListing, parseCatalogPage } from './parser';

describe('parseCatalogPage', () => {
  it('extracts JSON-LD products and same-origin ItemList/detail links', () => {
    const html = `
      <script nonce="x" type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Product",
              "name": "星灯亚克力立牌",
              "description": "  限定  商品  ",
              "sku": "STAR-001",
              "url": "/products/star-stand",
              "image": ["/images/star.jpg", {"contentUrl": "https://shop.example/images/star-2.png"}],
              "brand": {"name": "Moon Works"},
              "category": "acrylic-stand",
              "material": "Acrylic",
              "size": {"name": "150 mm"},
              "releaseDate": "2026-08-22T00:00:00Z",
              "offers": {"price": "1,980", "priceCurrency": "JPY"},
              "additionalProperty": [{"name": "Edition", "value": "First Press"}]
            },
            {
              "@type": "ItemList",
              "itemListElement": [
                {"@type": "ListItem", "item": {"url": "/products/moon-badge"}},
                {"@type": "Product", "name": "月影徽章", "sku": "MOON-002", "url": "/products/moon-badge"},
                {"@type": "ListItem", "url": "https://elsewhere.example/products/nope"}
              ]
            }
          ]
        }
      </script>
      <a href="/products/bonus?from=index#details">bonus</a>
      <a href="https://elsewhere.example/products/nope">outside</a>
    `;

    const parsed = parseCatalogPage(html, 'https://shop.example/catalog', {
      detailPathPattern: '/products/',
    });

    expect(parsed.products).toHaveLength(2);
    expect(parsed.products[0]).toMatchObject({
      sourceUrl: 'https://shop.example/products/star-stand',
      externalId: 'STAR-001',
      name: '星灯亚克力立牌',
      description: '限定 商品',
      skuCode: 'STAR-001',
      goodsType: 'acrylic-stand',
      material: 'Acrylic',
      sizeLabel: '150 mm',
      edition: 'First Press',
      releaseDate: '2026-08-22',
      msrpAmount: '1980',
      currencyCode: 'JPY',
      manufacturer: 'Moon Works',
      imageUrls: [
        'https://shop.example/images/star.jpg',
        'https://shop.example/images/star-2.png',
      ],
    });
    expect(parsed.detailUrls).toEqual([
      'https://shop.example/products/moon-badge',
      'https://shop.example/products/bonus?from=index',
    ]);
    expect(parsed.products[1]).toMatchObject({
      name: '月影徽章',
      skuCode: 'MOON-002',
    });
  });

  it('uses product OpenGraph data only when no JSON-LD product exists', () => {
    const html = `
      <meta content="product" property="og:type">
      <meta property="og:title" content="Aoi &amp; Ren Bromide">
      <meta property="og:url" content="/goods/bromide">
      <meta property="og:image" content="/images/bromide.webp">
      <meta property="product:retailer_item_id" content="BR-42">
      <meta property="product:price:amount" content="19.90">
      <meta property="product:price:currency" content="cny">
      <meta property="product:brand" content="谷布谷">
    `;

    expect(
      parseCatalogPage(html, 'https://shop.example/goods/bromide').products[0],
    ).toMatchObject({
      name: 'Aoi & Ren Bromide',
      sourceUrl: 'https://shop.example/goods/bromide',
      externalId: 'BR-42',
      skuCode: 'BR-42',
      msrpAmount: '19.90',
      currencyCode: 'CNY',
      manufacturer: '谷布谷',
      imageUrls: ['https://shop.example/images/bromide.webp'],
    });
  });
});

describe('parseCatalogPage — neogate 站点适配器', () => {
  // neogate 商品页只有 og:title / og:image，og:type 是 article，通用解析器会跳过；
  // 适配器接住它，并只收与页面 slug 同名前缀的商品图，排除关联文章缩略图。
  const html = `
    <head>
      <meta property="og:type" content="article">
      <meta property="og:title" content="『コードギアス』ホロEYE缶バッジ《第3弾》が登場！ | NEO GATE">
      <meta property="og:image" content="https://www.neogate.jp/wp-content/uploads/geass_holoeye3.webp">
      <meta property="og:description" content="全8種のホロEYE缶バッジ">
    </head>
    <body>
      <img src="https://www.neogate.jp/wp-content/uploads/neogate_rogo.png">
      <img src="https://www.neogate.jp/wp-content/uploads/geass_holoeye3_image01.webp">
      <img src="https://www.neogate.jp/wp-content/uploads/geass_babutans-150x150.webp">
    </body>`;

  it('accepts the article-typed product and keeps only slug-matched images', () => {
    const { products } = parseCatalogPage(
      html,
      'https://www.neogate.jp/geass_holoeye3/',
    );

    expect(products).toHaveLength(1);
    const product = products[0];
    // 营销后缀「が登場！」与「| NEO GATE」被清掉。
    expect(product.name).toBe('『コードギアス』ホロEYE缶バッジ《第3弾》');
    expect(product.skuCode).toBe('GEASS_HOLOEYE3');
    expect(product.externalId).toBe('geass_holoeye3');
    // og:image + 同 slug 图片；logo 与 -150x150 关联缩略图被排除。
    expect(product.imageUrls).toEqual([
      'https://www.neogate.jp/wp-content/uploads/geass_holoeye3.webp',
      'https://www.neogate.jp/wp-content/uploads/geass_holoeye3_image01.webp',
    ]);
    // 类型线索里含「缶バッジ」，供服务端推断为 can-badge。
    expect(product.goodsType).toContain('缶バッジ');
  });

  it('does not apply the neogate adapter to other hosts', () => {
    const { products } = parseCatalogPage(
      html.replace(/neogate\.jp/g, 'example.com'),
      'https://www.example.com/geass_holoeye3/',
    );

    expect(products).toHaveLength(0);
  });
});

describe('parseCatalogPage — animate-onlineshop 站点适配器', () => {
  // animate 商品页 og:type=article、无 Product JSON-LD；商品信息在内联脚本与 og:title，
  // 商品图以 JAN 作前缀。适配器接住它，排除促销 banner 与别的 JAN 的关联商品图。
  const cdn = 'https://tc-animate.techorus-cdn.com/resize_image/resize_image.php';
  const html = `
    <head>
      <meta property="og:type" content="article">
      <meta property="og:title" content="【グッズ-スタンドポップ】アニメ『呪術廻戦』5周年 アクリルスタンド／五条 悟 | アニメイト">
      <meta property="og:image" content="${cdn}?image=4550621662379_1_1779768313.jpg&width=1200&height=630">
      <meta property="og:description" content="5周年記念アクリルスタンド">
    </head>
    <body>
      <script>
        var product = { price: 1980, //商品金額(税込)
          jan_code: '4550621662379',
          _id2: '11031300', //商品コード
        };
      </script>
      <img src="${cdn}?image=4550621662379_1_1779768313.jpg&width=300&height=300&square=1">
      <img src="${cdn}?image=4550621662379_3_1779768334.jpg">
      <img src="https://tc-animate.techorus-cdn.com/upload/save_image/promo_banner.jpg">
      <img src="${cdn}?image=9990000000000_1_related.jpg">
    </body>`;

  const detailUrl =
    'https://www.animate-onlineshop.jp/pn/product-name/pd/3491416/';

  it('accepts the article-typed product from inline data and JAN-prefixed images', () => {
    const { products } = parseCatalogPage(html, detailUrl);

    expect(products).toHaveLength(1);
    const product = products[0];
    // 站名后缀被清掉，【分类】前缀保留。
    expect(product.name).toBe(
      '【グッズ-スタンドポップ】アニメ『呪術廻戦』5周年 アクリルスタンド／五条 悟',
    );
    expect(product.externalId).toBe('4550621662379');
    expect(product.skuCode).toBe('11031300');
    expect(product.msrpAmount).toBe('1980');
    expect(product.currencyCode).toBe('JPY');
    // og:image 与画廊图归一去尺寸后去重；promo banner 与别的 JAN 的关联商品图被排除。
    expect(product.imageUrls).toEqual([
      `${cdn}?image=4550621662379_1_1779768313.jpg`,
      `${cdn}?image=4550621662379_3_1779768334.jpg`,
    ]);
    // 类型线索含「アクリルスタンド」，供服务端推断。
    expect(product.goodsType).toContain('アクリルスタンド');
  });

  it('does not apply the animate adapter to other hosts', () => {
    const { products } = parseCatalogPage(
      html,
      'https://www.example.com/pn/product-name/pd/3491416/',
    );

    expect(products).toHaveLength(0);
  });
});

describe('parseCatalogListing — neogate 商品列表', () => {
  // 商品卡是 a.card-intext-inner（指向根路径 slug），分页是 a.next.page-numbers。
  // 导航 / feed / wp 链接一律不收，避免把页面脏数据当成商品。
  const listingHtml = `
    <a class="card-intext-inner" href="https://www.neogate.jp/geass_holoeye3/">商品1</a>
    <a class="card-intext-inner" href="https://www.neogate.jp/bluelock_dokibug/">商品2</a>
    <a class="menu-link" href="https://www.neogate.jp/wp-json/">json</a>
    <a href="https://www.neogate.jp/feed/">feed</a>
    <a class="page-numbers" href="https://www.neogate.jp/products/">1</a>
    <a class="next page-numbers" href="https://www.neogate.jp/products/page/2/">下一页</a>`;

  it('collects only product-card links and the next page', () => {
    const listing = parseCatalogListing(
      listingHtml,
      'https://www.neogate.jp/products/',
    );

    expect(listing).not.toBeNull();
    expect(listing?.productUrls).toEqual([
      'https://www.neogate.jp/geass_holoeye3/',
      'https://www.neogate.jp/bluelock_dokibug/',
    ]);
    expect(listing?.nextPageUrl).toBe(
      'https://www.neogate.jp/products/page/2/',
    );
  });

  it('returns null on a non-listing path even when related product cards exist', () => {
    // 商品页也带「相关商品」card-intext-inner；路径门控让它不被误当成列表页。
    expect(
      parseCatalogListing(listingHtml, 'https://www.neogate.jp/geass_holoeye3/'),
    ).toBeNull();
  });

  it('reports no next page on the last listing page', () => {
    const lastPage = `
      <a class="card-intext-inner" href="https://www.neogate.jp/reborn_usabiti/">末页商品</a>
      <a class="prev page-numbers" href="https://www.neogate.jp/products/page/38/">上一页</a>`;
    const listing = parseCatalogListing(
      lastPage,
      'https://www.neogate.jp/products/page/39/',
    );

    expect(listing?.productUrls).toEqual([
      'https://www.neogate.jp/reborn_usabiti/',
    ]);
    expect(listing?.nextPageUrl).toBeNull();
  });

  it('does not run listing discovery for other hosts', () => {
    expect(
      parseCatalogListing(
        listingHtml.replace(/neogate\.jp/g, 'example.com'),
        'https://www.example.com/products/',
      ),
    ).toBeNull();
  });
});
