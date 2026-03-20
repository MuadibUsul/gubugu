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
    label: '已拥有',
    description: '会点亮补全进度。',
  },
  wanted: {
    label: '想要',
    description: '把这个 SKU 保留在目标收藏架上。',
  },
  exchange: {
    label: '可交换',
    description: '标记这个 SKU 之后可用于换物。',
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
