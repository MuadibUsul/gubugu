import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { normalizeAndStoreUserScan } from './image-store';

describe('private user scan storage', () => {
  it('stores a normalized image by opaque content hash', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gubugu-user-scan-'));

    try {
      const source = await sharp({
        create: {
          width: 120,
          height: 160,
          channels: 3,
          background: '#c94b4b',
        },
      })
        .jpeg()
        .toBuffer();
      const stored = await normalizeAndStoreUserScan(source, directory);

      expect(stored.assetKey).toMatch(/^[a-f0-9]{64}\.webp$/);
      await expect(access(stored.path)).resolves.toBeUndefined();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
