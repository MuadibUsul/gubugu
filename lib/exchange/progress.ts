import type { ExchangeStatus } from './status';

export type ExchangeCheckpoints = {
  initiatorShipped: boolean;
  recipientShipped: boolean;
  initiatorReceived: boolean;
  recipientReceived: boolean;
};

export function deriveFulfillmentStatus(
  checkpoints: ExchangeCheckpoints,
): Extract<ExchangeStatus, 'accepted' | 'shipping' | 'received' | 'completed'> {
  const bothShipped =
    checkpoints.initiatorShipped && checkpoints.recipientShipped;
  if (
    (checkpoints.initiatorReceived || checkpoints.recipientReceived) &&
    !bothShipped
  ) {
    throw new Error('双方尚未都确认寄出，不能确认收货。');
  }
  if (checkpoints.initiatorReceived && checkpoints.recipientReceived)
    return 'completed';
  if (checkpoints.initiatorReceived || checkpoints.recipientReceived)
    return 'received';
  if (bothShipped) return 'shipping';
  return 'accepted';
}

export function canCancelBeforeShipping(
  status: ExchangeStatus,
  checkpoints: Pick<
    ExchangeCheckpoints,
    'initiatorShipped' | 'recipientShipped'
  >,
) {
  return (
    ['draft', 'proposed', 'accepted'].includes(status) &&
    !checkpoints.initiatorShipped &&
    !checkpoints.recipientShipped
  );
}
