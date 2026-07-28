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

export function getLocalSampleImageAsset(sampleIndex: number) {
  return (
    getLocalSampleImageAssets().find(
      (item) => item.sampleIndex === sampleIndex,
    ) ?? null
  );
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
