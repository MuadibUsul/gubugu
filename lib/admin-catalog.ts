export const adminCatalogEntityValues = ['ip', 'character', 'series'] as const;

export type AdminCatalogEntityType = (typeof adminCatalogEntityValues)[number];
export type AdminCatalogEntity = AdminCatalogEntityType;
export type AdminCatalogPublicationStatus = 'draft' | 'published' | 'archived';

export type AdminCatalogManagementFilters = {
  entity: AdminCatalogEntityType;
  query?: string;
  status?: AdminCatalogPublicationStatus;
  ipId?: string;
};

export function getAdminCatalogStatusBadgeClass(
  status: AdminCatalogPublicationStatus,
) {
  switch (status) {
    case 'published':
      return 'border-[color:color-mix(in_oklab,var(--accent)_46%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_10%,white)] text-foreground';
    case 'draft':
      return 'border-border/70 bg-card/80 text-muted-foreground';
    case 'archived':
      return 'border-border/70 bg-[color:color-mix(in_oklab,var(--background)_88%,var(--card))] text-muted-foreground';
    default:
      return 'border-border/70 bg-card/80 text-muted-foreground';
  }
}

export function getAdminCatalogEntityLabel(entity: AdminCatalogEntityType) {
  switch (entity) {
    case 'ip':
      return 'IP';
    case 'character':
      return '角色';
    case 'series':
      return '系列';
    default:
      return '实体';
  }
}

export function buildAdminCatalogManagementHref(
  filters: AdminCatalogManagementFilters,
  options?: {
    itemId?: string;
    recordId?: string;
    mode?: 'create';
    entity?: AdminCatalogEntityType;
  },
) {
  const params = new URLSearchParams();
  const entity = options?.entity ?? filters.entity;
  const recordId = options?.recordId ?? options?.itemId;

  params.set('entity', entity);

  if (filters.query) {
    params.set('query', filters.query);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.ipId && entity !== 'ip') {
    params.set('ipId', filters.ipId);
  }

  if (recordId) {
    params.set('recordId', recordId);
  }

  if (options?.mode === 'create') {
    params.set('mode', 'create');
  }

  return `/admin/catalog?${params.toString()}`;
}
