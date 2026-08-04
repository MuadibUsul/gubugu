import { describe, expect, it } from 'vitest';

import { toCssUrl } from './css-url';

describe('toCssUrl', () => {
  it('quotes a plain URL', () => {
    expect(toCssUrl('https://example.com/a.png')).toBe(
      'url("https://example.com/a.png")',
    );
  });

  it('keeps a URL containing spaces renderable', () => {
    expect(toCssUrl('https://example.com/my image.png')).toBe(
      'url("https://example.com/my image.png")',
    );
  });

  it('keeps a URL containing parentheses renderable', () => {
    expect(toCssUrl('https://example.com/a(1).png')).toBe(
      'url("https://example.com/a(1).png")',
    );
  });

  it('escapes double quotes so the string is not terminated early', () => {
    expect(toCssUrl('https://example.com/a".png')).toBe(
      'url("https://example.com/a\\".png")',
    );
  });

  it('escapes backslashes before quotes are considered', () => {
    expect(toCssUrl('https://example.com/a\\.png')).toBe(
      'url("https://example.com/a\\\\.png")',
    );
  });

  it('trims surrounding whitespace', () => {
    expect(toCssUrl('  https://example.com/a.png  ')).toBe(
      'url("https://example.com/a.png")',
    );
  });

  it.each([null, undefined, '', '   '])('returns null for %p', (value) => {
    expect(toCssUrl(value)).toBeNull();
  });

  it('returns null for a URL containing a newline', () => {
    expect(toCssUrl('https://example.com/a.png\nbad')).toBeNull();
  });
});
