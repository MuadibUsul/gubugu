import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import './sharp-security';

describe('sharp decoder security policy', () => {
  it('blocks GIF decoding while the pinned legacy sharp build is in use', async () => {
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==',
      'base64',
    );

    await expect(sharp(gif).metadata()).rejects.toThrow();
  });
});
