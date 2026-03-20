export type CreateGoodsPostActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialCreateGoodsPostActionState = {
  status: 'idle',
} satisfies CreateGoodsPostActionState;

export type SaveGoodsRatingActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialSaveGoodsRatingActionState = {
  status: 'idle',
} satisfies SaveGoodsRatingActionState;
