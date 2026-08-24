import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { normalizeAndStoreCatalogImage } from './image-store';

describe('normalizeAndStoreCatalogImage', () => {
  it('writes an immutable content-hash WebP trimmed to its native aspect', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gubugu-crawler-'));

    try {
      // 400×400 的浅底图，中间一个 200×120 深色块——模拟四周有留白的商品图。
      const content = await sharp({
        create: {
          width: 200,
          height: 120,
          channels: 4,
          background: { r: 20, g: 20, b: 20, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
      const source = await sharp({
        create: {
          width: 400,
          height: 400,
          channels: 4,
          background: { r: 250, g: 247, b: 249, alpha: 1 },
        },
      })
        .composite([{ input: content, gravity: 'centre' }])
        .png()
        .toBuffer();

      const first = await normalizeAndStoreCatalogImage(source, { directory });
      const second = await normalizeAndStoreCatalogImage(source, { directory });
      const metadata = await sharp(await readFile(first.path)).metadata();

      expect(first.fileName).toMatch(/^[a-f0-9]{64}\.webp$/);
      expect(second.hash).toBe(first.hash);
      // 相对同源路径，任何访问 origin 都能加载。
      expect(first.imageUrl).toBe(`/catalog-assets/${first.fileName}`);
      expect(metadata).toMatchObject({ format: 'webp', space: 'srgb' });
      // 裁掉四周留白：输出远小于 400×400，且保留内容的原始比例（不塞进固定画布）。
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(120);
      expect(first.width).toBe(200);
      expect(first.height).toBe(120);
      expect(metadata.hasAlpha).toBe(false);
      expect(metadata.exif).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
