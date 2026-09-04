import 'server-only';

import { join, resolve } from 'node:path';

import { normalizeAndStoreCatalogImage } from '@/server/catalog-crawler/image-store';

export const USER_SCAN_ASSET_DIRECTORY = resolve(
  process.cwd(),
  process.env.USER_SCAN_ASSET_DIR ?? join('.data', 'user-scans'),
);

export async function normalizeAndStoreUserScan(
  input: Buffer | Uint8Array,
  directory = USER_SCAN_ASSET_DIRECTORY,
) {
  const stored = await normalizeAndStoreCatalogImage(input, {
    directory,
  });

  return {
    assetKey: stored.fileName,
    path: stored.path,
  };
}

export function userScanAssetPath(assetKey: string) {
  if (!/^[a-f0-9]{64}\.webp$/.test(assetKey)) {
    throw new Error('Invalid user scan asset key.');
  }

  return join(USER_SCAN_ASSET_DIRECTORY, assetKey);
}
