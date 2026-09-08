import 'server-only';

import { join, resolve } from 'node:path';

import { normalizeAndStoreCatalogImage } from '@/server/catalog-crawler/image-store';

export const COMMUNITY_IMAGE_DIRECTORY = resolve(
  process.cwd(),
  process.env.COMMUNITY_IMAGE_ASSET_DIR ?? join('.data', 'community-images'),
);

export async function normalizeAndStoreCommunityImage(
  input: Buffer,
  options: { maxInputBytes?: number } = {},
) {
  return normalizeAndStoreCatalogImage(input, {
    ...options,
    directory: COMMUNITY_IMAGE_DIRECTORY,
  });
}

export function communityImageAssetPath(assetKey: string) {
  if (!/^[a-f0-9]{64}\.webp$/.test(assetKey)) {
    throw new Error('Invalid community image asset key.');
  }
  return join(COMMUNITY_IMAGE_DIRECTORY, assetKey);
}
