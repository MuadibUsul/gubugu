import { describe, expect, it } from 'vitest';

import { isAcceptedImageMimeType } from './image-upload';

describe('image upload types', () => {
  it('accepts raster web image formats and rejects active SVG content', () => {
    expect(isAcceptedImageMimeType('image/jpeg')).toBe(true);
    expect(isAcceptedImageMimeType('image/webp')).toBe(true);
    expect(isAcceptedImageMimeType('image/svg+xml')).toBe(false);
  });
});
