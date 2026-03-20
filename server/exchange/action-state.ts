export type CreateExchangeListingActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialCreateExchangeListingActionState = {
  status: 'idle',
} satisfies CreateExchangeListingActionState;
