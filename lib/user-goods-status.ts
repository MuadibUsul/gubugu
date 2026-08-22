import { z } from 'zod';

export const userGoodsStatusValues = ['owned', 'wanted', 'exchange'] as const;

export const userGoodsStatusSchema = z.enum(userGoodsStatusValues);

export type UserGoodsStatus = (typeof userGoodsStatusValues)[number];

export const userGoodsStatusMeta: Record<
  UserGoodsStatus,
  {
    label: string;
    description: string;
  }
> = {
  owned: {
    label: '谷柜收藏',
    description: '收入谷柜；扫描实物后才会点亮',
  },
  wanted: {
    label: '想要',
    description: '加入想要清单',
  },
  exchange: {
    label: '可交换',
    description: '用于交换展示',
  },
};

export function sortUserGoodsStatuses(statuses: Iterable<UserGoodsStatus>) {
  const order = new Map(
    userGoodsStatusValues.map((value, index) => [value, index]),
  );

  return Array.from(new Set(statuses)).sort(
    (left, right) => (order.get(left) ?? 99) - (order.get(right) ?? 99),
  );
}
