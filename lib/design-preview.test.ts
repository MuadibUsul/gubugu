import { expect, it } from 'vitest';

import {
  collectionPreviewGoods,
  filterPreviewGoods,
  previewGoods,
} from './design-preview';

it('keeps library filters and collection states semantically distinct', () => {
  expect(filterPreviewGoods(previewGoods, '帕姆', '全部')).toHaveLength(1);
  expect(filterPreviewGoods(previewGoods, '', '色纸')).toHaveLength(2);
  expect(
    collectionPreviewGoods(previewGoods, '已入柜').map((item) => item.id),
  ).toEqual(['p1', 'p2']);
  expect(
    collectionPreviewGoods(previewGoods, '已点亮').map((item) => item.id),
  ).toEqual(['p1']);
  expect(
    collectionPreviewGoods(previewGoods, '实拍').map((item) => item.id),
  ).toEqual(['p5']);
});
