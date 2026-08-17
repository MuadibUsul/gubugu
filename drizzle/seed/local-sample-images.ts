import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
} from 'node:fs';
import { extname, join, resolve } from 'node:path';

const sourceDir = resolve(process.cwd(), 'images');
const publicDir = resolve(process.cwd(), 'public', 'local-sample-images');
const supportedExtensions = new Set([
  '.jpg',
  '.jpeg',
  '.jfif',
  '.png',
  '.webp',
  '.avif',
]);

export type LocalSampleImageAsset = {
  sampleIndex: number;
  sourceName: string;
  publicPath: string;
  storagePath: string;
  sourcePath: string;
  targetFileName: string;
};

function listSourceImageNames() {
  if (!existsSync(sourceDir)) {
    return [];
  }

  return readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => supportedExtensions.has(extname(name).toLowerCase()))
    .sort((left, right) =>
      left.localeCompare(right, 'zh-CN', {
        numeric: true,
        sensitivity: 'base',
      }),
    );
}

export function getLocalSampleImageAssets(): LocalSampleImageAsset[] {
  return listSourceImageNames().map((sourceName, index) => {
    const sampleIndex = index + 1;
    const extension = extname(sourceName).toLowerCase() || '.jpg';
    const targetFileName = `guzi-sample-${String(sampleIndex).padStart(2, '0')}${extension}`;

    return {
      sampleIndex,
      sourceName,
      publicPath: `/local-sample-images/${targetFileName}`,
      storagePath: `local-sample-images/${targetFileName}`,
      sourcePath: join(sourceDir, sourceName),
      targetFileName,
    };
  });
}

/**
 * 按序号取一张样例图，超出可用张数时回绕。
 *
 * 图位（商品图、作品封面、角色头像、系列封面、帖子图）比 images/ 里的图多，
 * 早先的实现在序号越界时返回 null，调用方就退回生成的占位 SVG —— 结果是站
 * 上大部分位置都在显示占位图，而真图闲置。回绕之后每个位置都拿得到真图，
 * 重复使用好过空着。
 */
export function getLocalSampleImageAsset(sampleIndex: number) {
  const assets = getLocalSampleImageAssets();

  if (assets.length === 0 || !Number.isFinite(sampleIndex) || sampleIndex < 1) {
    return null;
  }

  return assets[(Math.floor(sampleIndex) - 1) % assets.length] ?? null;
}

export function syncLocalSampleImages() {
  const assets = getLocalSampleImageAssets();

  mkdirSync(publicDir, { recursive: true });

  for (const fileName of readdirSync(publicDir)) {
    if (fileName.startsWith('guzi-sample-')) {
      unlinkSync(join(publicDir, fileName));
    }
  }

  for (const asset of assets) {
    copyFileSync(asset.sourcePath, join(publicDir, asset.targetFileName));
  }

  return assets;
}
