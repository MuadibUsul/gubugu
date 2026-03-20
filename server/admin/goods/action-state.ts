export type SaveAdminGoodsActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialSaveAdminGoodsActionState = {
  status: 'idle',
} satisfies SaveAdminGoodsActionState;
