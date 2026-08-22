import { describe, expect, it } from 'vitest';

import {
  internalPathSchema,
  isInternalPath,
  normalizeInternalPath,
} from './internal-path';

describe('internal paths', () => {
  it('accepts routes with query strings and hashes', () => {
    expect(isInternalPath('/goods/a?tab=notes#community')).toBe(true);
    expect(internalPathSchema.parse('/me/exchanges')).toBe('/me/exchanges');
  });

  it('rejects protocol-relative and backslash redirects', () => {
    expect(isInternalPath('//example.com')).toBe(false);
    expect(isInternalPath('/\\example.com')).toBe(false);
    expect(isInternalPath('https://example.com')).toBe(false);
  });

  it('falls back when the supplied route is unsafe', () => {
    expect(normalizeInternalPath('//example.com', '/search')).toBe('/search');
    expect(normalizeInternalPath(undefined)).toBe('/');
  });
});
