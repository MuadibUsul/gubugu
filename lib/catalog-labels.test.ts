import { describe, expect, it } from 'vitest';

import {
  formatGoodsTypeLabel,
  formatMaterialLabel,
  formatTagLabel,
} from './catalog-labels';

describe('catalog labels', () => {
  it('turns stored catalogue codes into readable Chinese labels', () => {
    expect(formatGoodsTypeLabel('acrylic-stand')).toBe('亚克力立牌');
    expect(formatMaterialLabel('Tinplate')).toBe('马口铁');
    expect(formatTagLabel('event-limited', 'Event Limited')).toBe('活动限定');
  });

  it('keeps unknown imported values readable', () => {
    expect(formatGoodsTypeLabel('new-item')).toBe('new / item');
    expect(formatMaterialLabel('Mixed resin')).toBe('Mixed resin');
    expect(formatTagLabel('new-tag', 'New Tag')).toBe('New Tag');
  });
});
