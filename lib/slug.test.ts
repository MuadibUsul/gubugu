import { describe, expect, it } from 'vitest';

import { slugifyText } from './slug';

describe('slugifyText', () => {
  it('lowercases and hyphenates a normal title', () => {
    expect(slugifyText('Spring Bloom Fair 2026')).toBe(
      'spring-bloom-fair-2026',
    );
  });

  it('strips diacritics rather than dropping the letter', () => {
    expect(slugifyText('Café Crème')).toBe('cafe-creme');
  });

  it('collapses runs of separators and trims the edges', () => {
    expect(slugifyText('  --Aoi   &&&  Ren--  ')).toBe('aoi-ren');
  });

  it('returns an empty string for input with no ASCII alphanumerics', () => {
    // Worth pinning: the goods/series slug columns are `notNull`, so callers
    // cannot rely on this to produce a usable slug for CJK-only names.
    expect(slugifyText('月白蒼')).toBe('');
    expect(slugifyText('!!!')).toBe('');
  });

  it('is idempotent', () => {
    const once = slugifyText('Aoi Tsukishiro — Spring Ver.');

    expect(slugifyText(once)).toBe(once);
  });
});
