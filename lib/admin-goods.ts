export type AdminGoodsPublicationStatus = 'draft' | 'published' | 'archived';

export type AdminGoodsManagementFilters = {
  query?: string;
  status?: AdminGoodsPublicationStatus;
  seriesId?: string;
};

export function getAdminGoodsPublicationStatusLabel(
  status: AdminGoodsPublicationStatus,
) {
  switch (status) {
    case 'published':
      return '已发布';
    case 'draft':
      return '草稿';
    case 'archived':
      return '已归档';
    default:
      return '未知状态';
  }
}

export function getAdminGoodsStatusBadgeClass(
  status: AdminGoodsPublicationStatus,
) {
  switch (status) {
    case 'published':
      return 'border-[color:color-mix(in_oklab,var(--accent)_56%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_16%,var(--surface-strong))] text-[color:color-mix(in_oklab,white_92%,var(--accent))] shadow-[inset_0_1px_0_color-mix(in_oklab,white_10%,transparent)]';
    case 'draft':
      return 'border-border/70 bg-[color:color-mix(in_oklab,var(--card)_86%,var(--background))] text-[color:color-mix(in_oklab,var(--foreground)_80%,var(--background))]';
    case 'archived':
      return 'border-border/70 bg-[color:color-mix(in_oklab,var(--background)_92%,var(--card))] text-[color:color-mix(in_oklab,var(--foreground)_72%,var(--background))]';
    default:
      return 'border-border/70 bg-[color:color-mix(in_oklab,var(--card)_86%,var(--background))] text-[color:color-mix(in_oklab,var(--foreground)_80%,var(--background))]';
  }
}

export function buildAdminGoodsManagementHref(
  filters: AdminGoodsManagementFilters,
  options?: {
    goodsId?: string;
    mode?: 'create';
  },
) {
  const params = new URLSearchParams();

  if (filters.query) {
    params.set('query', filters.query);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.seriesId) {
    params.set('seriesId', filters.seriesId);
  }

  if (options?.goodsId) {
    params.set('goodsId', options.goodsId);
  }

  if (options?.mode === 'create') {
    params.set('mode', 'create');
  }

  const queryString = params.toString();

  return queryString ? `/admin/goods?${queryString}` : '/admin/goods';
}
