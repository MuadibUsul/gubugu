import { z } from 'zod';

const goodsCommunityBucketNameSchema = z
  .string()
  .trim()
  .min(3)
  .max(63)
  .default('goods-community');

export const goodsCommunityUploadLimits = {
  maxFiles: 4,
  maxFileSizeBytes: 5 * 1024 * 1024,
} as const;

export function getGoodsCommunityBucketName() {
  return goodsCommunityBucketNameSchema.parse(
    process.env.NEXT_PUBLIC_SUPABASE_GOODS_COMMUNITY_BUCKET ??
      process.env.SUPABASE_GOODS_COMMUNITY_BUCKET ??
      'goods-community',
  );
}

export function sanitizeStorageFilename(fileName: string) {
  const trimmed = fileName.trim().toLowerCase();
  const dotIndex = trimmed.lastIndexOf('.');
  const baseName = dotIndex >= 0 ? trimmed.slice(0, dotIndex) : trimmed;
  const extension = dotIndex >= 0 ? trimmed.slice(dotIndex) : '';

  const safeBaseName =
    baseName
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'upload';

  const safeExtension = extension.replace(/[^a-z0-9.]/g, '').slice(0, 10);

  return `${safeBaseName}${safeExtension || '.bin'}`;
}
