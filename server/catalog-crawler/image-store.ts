import 'server-only';

import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import sharp from 'sharp';

import { warmImagePreviews } from '@/server/image-variants';

import { CRAWLER_IMAGE_MAX_BYTES } from './safe-fetch';

// 目录图不再贴进固定大画布——那样小源图四周全是空白，显示时产品只占一小块，白白浪费源
// 清晰度。改为动态画框：缩到长边 ≤ MAX_EDGE（不放大），裁掉四周纯色留白，按内容原始比例
// 存下。任何尺寸都不损失清晰度；前端在统一尺寸卡片里用 object-fit: contain 完整、清晰地
// 呈现，卡片大小一致。
export const CATALOG_IMAGE_MAX_EDGE = 1400;
export const CATALOG_ASSET_DIRECTORY = resolve(
  /* turbopackIgnore: true */
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
  return join(/* turbopackIgnore: true */ resolve(directory), fileName);
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

  // 缩到长边上限（不放大）、去 EXIF、拍平透明到浅背景、转 sRGB，作为基准。
  const base = await image
    .rotate()
    .resize({
      width: CATALOG_IMAGE_MAX_EDGE,
      height: CATALOG_IMAGE_MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .flatten({ background })
    .toColourspace('srgb')
    .toBuffer();

  // 裁掉四周纯色留白，让产品占满画框、各图产品大小更接近。整图纯色或裁得过狠（疑似误裁）
  // 时回退到未裁剪，避免异常。
  let prepared = base;
  try {
    const trimmed = await sharp(base).trim({ threshold: 12 }).toBuffer();
    const trimmedMeta = await sharp(trimmed).metadata();
    if (
      trimmedMeta.width &&
      trimmedMeta.height &&
      trimmedMeta.width >= 80 &&
      trimmedMeta.height >= 80
    ) {
      prepared = trimmed;
    }
  } catch {
    // 无可裁边界（整图纯色等）→ 用未裁剪的基准。
  }

  // 按内容原始比例存下（动态画框），不塞进固定画布。
  const { data, info } = await sharp(prepared)
    .webp({ quality: 90, smartSubsample: true })
    .toBuffer({ resolveWithObject: true });

  const hash = createHash('sha256').update(data).digest('hex');
  const fileName = `${hash}.webp`;
  const directory = resolve(
    /* turbopackIgnore: true */ options.directory ?? CATALOG_ASSET_DIRECTORY,
  );
  const path = catalogAssetPath(fileName, directory);

  await mkdir(directory, { recursive: true });
  try {
    await writeFile(path, data, { flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }

  // Small list previews are ready before publication; larger sizes are disk-cached on demand.
  await warmImagePreviews(path).catch((error: unknown) => {
    console.warn(
      'Image preview warmup failed; original remains available.',
      error,
    );
  });

  return {
    hash,
    fileName,
    path,
    // 相对同源路径，和种子数据一致：任何访问 origin（127.0.0.1 / localhost / 生产域名）都能
    // 加载，并可走 next/image 优化。需要绝对 URL 的地方（识别 API、分享卡）由 toAbsoluteImageUrl
    // 统一补全。此前存绝对 http://localhost:3000 会在以 127.0.0.1 访问时跨源加载失败。
    imageUrl: `/catalog-assets/${fileName}`,
    width: info.width,
    height: info.height,
    mimeType: 'image/webp',
    byteLength: data.byteLength,
  };
}
