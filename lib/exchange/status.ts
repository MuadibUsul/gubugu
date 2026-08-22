import { z } from 'zod';

/**
 * 换谷单的无资金履约状态机。状态转换必须由服务端调用本模块校验，避免页面各自
 * 判断造成跳步或绕过。
 */
export const exchangeStatusValues = [
  'draft',
  'proposed',
  'accepted',
  'shipping',
  'received',
  'completed',
  'cancelled',
] as const;

export type ExchangeStatus = (typeof exchangeStatusValues)[number];

export const exchangeStatusSchema = z.enum(exchangeStatusValues);

const transitions: Record<ExchangeStatus, readonly ExchangeStatus[]> = {
  draft: ['proposed', 'cancelled'],
  proposed: ['accepted', 'cancelled'],
  accepted: ['shipping', 'cancelled'],
  shipping: ['received'],
  received: ['completed'],
  completed: [],
  cancelled: [],
};

export const terminalExchangeStatuses: readonly ExchangeStatus[] = [
  'completed',
  'cancelled',
];

export const exchangeStatusLabels: Record<ExchangeStatus, string> = {
  draft: '草稿',
  proposed: '待接受',
  accepted: '已接受',
  shipping: '交换中',
  received: '已收货',
  completed: '已完成',
  cancelled: '已取消',
};

export function canTransitionExchange(
  from: ExchangeStatus,
  to: ExchangeStatus,
) {
  return transitions[from].includes(to);
}

export function isTerminalExchangeStatus(status: ExchangeStatus) {
  return terminalExchangeStatuses.includes(status);
}

export class ExchangeTransitionError extends Error {
  constructor(
    public readonly from: ExchangeStatus,
    public readonly to: ExchangeStatus,
  ) {
    super(
      `换谷单状态不能从「${exchangeStatusLabels[from]}」变为「${exchangeStatusLabels[to]}」。`,
    );
    this.name = 'ExchangeTransitionError';
  }
}

export function assertExchangeTransition(
  from: ExchangeStatus,
  to: ExchangeStatus,
) {
  if (!canTransitionExchange(from, to)) {
    throw new ExchangeTransitionError(from, to);
  }
}
