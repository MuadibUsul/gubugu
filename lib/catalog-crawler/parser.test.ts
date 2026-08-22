import { describe, expect, it } from 'vitest';

import { parseCatalogPage } from './parser';

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
