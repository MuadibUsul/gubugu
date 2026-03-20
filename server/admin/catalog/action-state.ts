export type SaveAdminCatalogEntityActionState = {
  status: 'idle' | 'error';
  message?: string;
};

export const initialSaveAdminCatalogEntityActionState = {
  status: 'idle',
} satisfies SaveAdminCatalogEntityActionState;
