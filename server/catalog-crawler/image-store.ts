import 'server-only';

import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import sharp from 'sharp';

import { CRAWLER_IMAGE_MAX_BYTES } from './safe-fetch';

export const CATALOG_IMAGE_WIDTH = 1600;
export const CATALOG_IMAGE_HEIGHT = 2000;
export const CATALOG_ASSET_DIRECTORY = resolve(
  process.cwd(),
  process.env.CATALOG_ASSET_DIR ?? join('.data', 'catalog-assets'),
);

const catalogAssetNamePattern = /^[a-f0-9]{64}\.webp$/;

export type StoredCatalogImage = {
  hash: string;
  fileName: string;
  path: string;
  imageUrl: string;
  width: number;
  height: number;
  mimeType: 'image/webp';
  byteLength: number;
};

export function catalogAssetPath(
  fileName: string,
  directory = CATALOG_ASSET_DIRECTORY,
) {
  if (!catalogAssetNamePattern.test(fileName)) {
    throw new Error('Invalid catalog asset name.');
  }
  return join(resolve(directory), fileName);
}

export async function catalogAssetExists(fileName: string) {
  try {
    await access(catalogAssetPath(fileName), constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export async function normalizeAndStoreCatalogImage(
  input: Buffer | Uint8Array,
  options: {
    appUrl?: string;
    directory?: string;
    maxInputBytes?: number;
  } = {},
): Promise<StoredCatalogImage> {
  const source = Buffer.from(input);
  const maxInputBytes = options.maxInputBytes ?? CRAWLER_IMAGE_MAX_BYTES;
  if (source.byteLength === 0 || source.byteLength > maxInputBytes) {
    throw new Error(
      `Catalog image must be between 1 and ${maxInputBytes} bytes.`,
    );
  }

  const image = sharp(source, {
    animated: false,
    failOn: 'warning',
    limitInputPixels: 40_000_000,
  });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Catalog image has no readable dimensions.');
  }
  if (!metadata.format || !['jpeg', 'png', 'webp'].includes(metadata.format)) {
    throw new Error('Catalog image must be JPEG, PNG, or WebP.');
  }
  if ((metadata.pages ?? 1) > 1) {
    throw new Error('Animated catalog images are not supported.');
  }

  const background = { r: 250, g: 247, b: 249, alpha: 1 };
  const prepared = await image
    .rotate()
    .resize({
      width: 1344,
      height: 1680,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .toColourspace('srgb')
    .toBuffer();
  const { data, info } = await sharp({
    create: {
      width: CATALOG_IMAGE_WIDTH,
      height: CATALOG_IMAGE_HEIGHT,
      channels: 4,
      background,
    },
  })
    .composite([{ input: prepared, gravity: 'centre' }])
    .flatten({ background })
    .webp({ quality: 88, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  const hash = createHash('sha256').update(data).digest('hex');
  const fileName = `${hash}.webp`;
  const directory = resolve(options.directory ?? CATALOG_ASSET_DIRECTORY);
  const path = catalogAssetPath(fileName, directory);

  await mkdir(directory, { recursive: true });
  try {
    await writeFile(path, data, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }

  const appUrl = new URL(
    options.appUrl ??
      process.env.APP_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      'http://127.0.0.1:3000',
  );
  if (appUrl.protocol !== 'http:' && appUrl.protocol !== 'https:') {
    throw new Error('APP_URL must use HTTP or HTTPS.');
  }

  return {
    hash,
    fileName,
    path,
    imageUrl: new URL(`/catalog-assets/${fileName}`, appUrl).toString(),
    width: info.width,
    height: info.height,
    mimeType: 'image/webp',
    byteLength: data.byteLength,
  };
}
