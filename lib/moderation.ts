import { z } from 'zod';

export const moderationStatusValues = [
  'pending',
  'approved',
  'rejected',
] as const;

export const moderationQueueModuleValues = [
  'catalog-submission',
  'photo-upload',
  'comment',
] as const;

export const moderationStatusSchema = z.enum(moderationStatusValues);
export const moderationQueueModuleSchema = z.enum(moderationQueueModuleValues);

export type ModerationStatus = z.infer<typeof moderationStatusSchema>;
export type ModerationQueueModule = z.infer<typeof moderationQueueModuleSchema>;

export const moderationStatusMeta: Record<
  ModerationStatus,
  {
    label: string;
    description: string;
    toneClassName: string;
  }
> = {
  pending: {
    label: '待审核',
    description: '等待人工审核结论。',
    toneClassName:
      'border-[color:color-mix(in_oklab,var(--accent)_52%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_14%,white)] text-foreground',
  },
  approved: {
    label: '已通过',
    description: '允许显示在公开的 SKU 页面中。',
    toneClassName:
      'border-[color:color-mix(in_oklab,var(--primary)_40%,var(--border))] bg-[color:color-mix(in_oklab,var(--primary)_12%,white)] text-foreground',
  },
  rejected: {
    label: '已拒绝',
    description: '在重新提交前不会公开显示。',
    toneClassName:
      'border-[color:color-mix(in_oklab,var(--destructive)_34%,var(--border))] bg-[color:color-mix(in_oklab,var(--destructive)_10%,white)] text-foreground',
  },
};

export const catalogSubmissionTypeValues = ['create', 'update'] as const;

export const catalogSubmissionTypeSchema = z.enum(catalogSubmissionTypeValues);

export type CatalogSubmissionType = z.infer<typeof catalogSubmissionTypeSchema>;

export const catalogSubmissionTypeMeta: Record<
  CatalogSubmissionType,
  {
    label: string;
    description: string;
  }
> = {
  create: {
    label: '新建条目',
    description: '用户提交一个全新的图鉴记录。',
  },
  update: {
    label: '更新条目',
    description: '用户对现有记录提交结构化修正。',
  },
};

export const catalogSubmissionTargetTypeValues = [
  'ip',
  'character',
  'series',
  'goods',
] as const;

export const catalogSubmissionTargetTypeSchema = z.enum(
  catalogSubmissionTargetTypeValues,
);

export type CatalogSubmissionTargetType = z.infer<
  typeof catalogSubmissionTargetTypeSchema
>;

export const catalogSubmissionTargetTypeMeta: Record<
  CatalogSubmissionTargetType,
  {
    label: string;
  }
> = {
  ip: {
    label: 'IP',
  },
  character: {
    label: '角色',
  },
  series: {
    label: '系列',
  },
  goods: {
    label: '商品 SKU',
  },
};
