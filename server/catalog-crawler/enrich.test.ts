import { afterEach, describe, expect, it } from 'vitest';

import {
  enrichCatalogProduct,
  parseEnrichmentText,
  roughSplit,
} from './enrich';
import type { ParsedCatalogProduct } from '@/lib/catalog-crawler/parser';

const product: ParsedCatalogProduct = {
  sourceUrl: 'https://example.com/x',
  externalId: 'x',
  name: '『コードギアス 反逆のルルーシュ』ホロEYE缶バッジ《第3弾》',
  description: null,
  skuCode: 'X',
  goodsType: null,
  material: null,
  sizeLabel: null,
  edition: null,
  releaseDate: null,
  msrpAmount: null,
  currencyCode: null,
  manufacturer: null,
  imageUrls: [],
  rawPayload: {},
};

describe('roughSplit', () => {
  it('pulls the IP out of 『』 brackets', () => {
    expect(roughSplit('『コードギアス』ホロEYE缶バッジ')).toEqual({
      ipGuess: 'コードギアス',
      remainder: 'ホロEYE缶バッジ',
    });
  });

  it('returns no IP guess when there are no brackets', () => {
    expect(roughSplit('ただの缶バッジ')).toEqual({
      ipGuess: null,
      remainder: 'ただの缶バッジ',
    });
  });
});

describe('parseEnrichmentText', () => {
  it('parses a plain JSON object', () => {
    const data = parseEnrichmentText(
      '{"name":"反叛的鲁路修 全息徽章 第3弹","ipName":"反叛的鲁路修","seriesName":null,"characterNames":["鲁路修","朱雀"],"goodsType":"徽章","description":null}',
    );
    expect(data?.name).toBe('反叛的鲁路修 全息徽章 第3弹');
    expect(data?.ipName).toBe('反叛的鲁路修');
    expect(data?.characterNames).toEqual(['鲁路修', '朱雀']);
  });

  it('tolerates code-fenced JSON', () => {
    const data = parseEnrichmentText(
      '```json\n{"name":"徽章","ipName":null,"seriesName":null,"characterNames":[],"goodsType":null,"description":null}\n```',
    );
    expect(data?.name).toBe('徽章');
  });

  it('returns null on non-JSON or a missing required name', () => {
    expect(parseEnrichmentText('抱歉我无法处理')).toBeNull();
    expect(parseEnrichmentText('{"ipName":"x"}')).toBeNull();
  });
});

describe('enrichCatalogProduct', () => {
  const original = process.env.DEEPSEEK_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = original;
  });

  it('skips gracefully when no API key is set', async () => {
    delete process.env.DEEPSEEK_API_KEY;
    const result = await enrichCatalogProduct(product);
    expect(result.status).toBe('skipped');
  });
});
