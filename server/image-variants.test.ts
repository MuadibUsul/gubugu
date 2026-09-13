import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';
import { expect, it } from 'vitest';

import { imageAssetResponse } from './image-variants';

it('persists smaller previews without changing originals, reuses them and revalidates bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'gbg-previews-'));
  try {
    const source = join(directory, `${'a'.repeat(64)}.webp`);
    const original = await sharp({
      create: { width: 800, height: 1200, channels: 3, background: '#9c4b63' },
    })
      .webp()
      .toBuffer();
    await writeFile(source, original);
    const request = new Request('https://local.test/image?w=320');
    const responses = await Promise.all([
      imageAssetResponse(request, source),
      imageAssetResponse(request, source),
    ]);
    const bytes = Buffer.from(await responses[0].arrayBuffer());
    expect(await sharp(bytes).metadata()).toMatchObject({
      width: 320,
      height: 480,
    });
    const expected = await sharp(original)
      .resize({ width: 320, withoutEnlargement: true })
      .webp({ quality: 90, smartSubsample: true, effort: 2 })
      .toBuffer();
    expect(bytes).toEqual(expected);
    expect(bytes.length).toBeLessThan(original.length);
    expect(await readFile(source)).toEqual(original);
    expect(responses[0].headers.get('cache-control')).toBe('private, no-cache');
    expect(await readdir(join(directory, '.previews-v1'))).toHaveLength(1);
    const cached = join(
      directory,
      '.previews-v1',
      `${'a'.repeat(64)}.webp.320.webp`,
    );
    const before = await stat(cached);
    const revalidated = await imageAssetResponse(
      new Request(request, {
        headers: { 'If-None-Match': `W/${responses[0].headers.get('etag')}` },
      }),
      source,
    );
    expect(revalidated.status).toBe(304);
    expect(await revalidated.text()).toBe('');
    expect((await stat(cached)).mtimeMs).toBe(before.mtimeMs);
    expect(
      (
        await imageAssetResponse(
          new Request('https://local.test/image?w=999999'),
          source,
        )
      ).status,
    ).toBe(400);
    const full = await imageAssetResponse(
      new Request('https://local.test/image'),
      source,
      true,
    );
    expect(Buffer.from(await full.arrayBuffer())).toEqual(original);
    expect(full.headers.get('cache-control')).toContain('immutable');
    await rm(source);
    await expect(imageAssetResponse(request, source)).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
