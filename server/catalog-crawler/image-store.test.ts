import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import {
  CATALOG_IMAGE_HEIGHT,
  CATALOG_IMAGE_WIDTH,
  normalizeAndStoreCatalogImage,
} from './image-store';

describe('normalizeAndStoreCatalogImage', () => {
  it('writes an immutable content-hash WebP on a fixed canvas', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gubugu-crawler-'));

    try {
      const source = await sharp({
        create: {
          width: 320,
          height: 200,
          channels: 4,
          background: { r: 230, g: 80, b: 140, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();

      const first = await normalizeAndStoreCatalogImage(source, {
        appUrl: 'https://gubugu.example',
        directory,
      });
      const second = await normalizeAndStoreCatalogImage(source, {
        appUrl: 'https://gubugu.example',
        directory,
      });
      const metadata = await sharp(await readFile(first.path)).metadata();

      expect(first.fileName).toMatch(/^[a-f0-9]{64}\.webp$/);
      expect(second.hash).toBe(first.hash);
      expect(first.imageUrl).toBe(
        `https://gubugu.example/catalog-assets/${first.fileName}`,
      );
      expect(metadata).toMatchObject({
        format: 'webp',
        width: CATALOG_IMAGE_WIDTH,
        height: CATALOG_IMAGE_HEIGHT,
        space: 'srgb',
      });
      expect(metadata.hasAlpha).toBe(false);
      expect(metadata.exif).toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
