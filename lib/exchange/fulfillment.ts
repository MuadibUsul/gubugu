import { z } from 'zod';

export const exchangeFulfillmentMethodValues = [
  'shipping',
  'meetup',
  'either',
] as const;

export const exchangeFulfillmentMethodSchema = z.enum(
  exchangeFulfillmentMethodValues,
);

export type ExchangeFulfillmentMethod = z.infer<
  typeof exchangeFulfillmentMethodSchema
>;

export const exchangeFulfillmentMethodMeta: Record<
  ExchangeFulfillmentMethod,
  { label: string; description: string }
> = {
  shipping: { label: '邮寄', description: '通过邮寄完成交换。' },
  meetup: { label: '面交', description: '在约定地点当面交换。' },
  either: { label: '都可以', description: '邮寄或面交均可。' },
};
