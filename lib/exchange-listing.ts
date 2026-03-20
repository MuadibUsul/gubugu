import { z } from 'zod';

export const exchangeFulfillmentMethodValues = [
  'shipping',
  'meetup',
  'either',
] as const;

export const exchangeListingStatusValues = [
  'open',
  'paused',
  'closed',
] as const;

export const exchangeFulfillmentMethodSchema = z.enum(
  exchangeFulfillmentMethodValues,
);

export type ExchangeFulfillmentMethod = z.infer<
  typeof exchangeFulfillmentMethodSchema
>;

export type ExchangeListingStatus = (typeof exchangeListingStatusValues)[number];

export const exchangeFulfillmentMethodMeta: Record<
  ExchangeFulfillmentMethod,
  {
    label: string;
    description: string;
  }
> = {
  shipping: {
    label: '邮寄',
    description: '可以接受通过邮寄完成交换。',
  },
  meetup: {
    label: '面交',
    description: '更倾向于本地当面交换。',
  },
  either: {
    label: '都可以',
    description: '邮寄或面交都能接受。',
  },
};

export const exchangeListingStatusMeta: Record<
  ExchangeListingStatus,
  {
    label: string;
    toneClassName: string;
  }
> = {
  open: {
    label: '进行中',
    toneClassName:
      'border-[color:color-mix(in_oklab,var(--accent)_58%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_14%,white)] text-foreground',
  },
  paused: {
    label: '已暂停',
    toneClassName: 'border-border/70 bg-background/78 text-muted-foreground',
  },
  closed: {
    label: '已关闭',
    toneClassName: 'border-border/70 bg-card/72 text-muted-foreground',
  },
};
