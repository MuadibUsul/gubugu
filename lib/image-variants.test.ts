import { expect, it } from 'vitest';

import { imagePreviewProps } from './image-variants';

it('builds bounded srcsets and preserves private back-side query parameters', () => {
  const src =
    '/api/user-scans/12345678-1234-1234-1234-123456789abc/image?side=back';
  const preview = imagePreviewProps(src, '100px');
  expect(preview.src).toBe(`${src}&w=320`);
  expect(preview.sizes).toBe('100px');
  expect(preview.srcSet?.split(', ')).toHaveLength(5);
  expect(preview.srcSet).toContain(`${src}&w=640 640w`);
  expect(
    imagePreviewProps(`/catalog-assets/${'a'.repeat(64)}.webp`, '50vw').srcSet,
  ).toBeDefined();
  for (const untouched of [
    'blob:photo',
    '/demo-assets/a.svg',
    'https://other.test/a.jpg',
    '/api/profile',
    '//other.test/a.jpg',
  ]) {
    expect(imagePreviewProps(untouched, '50px')).toEqual({ src: untouched });
  }
});
