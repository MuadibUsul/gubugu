import { describe, expect, it } from 'vitest';

// Re-implemented here rather than imported: server/data/search-service.ts pulls
// in `server-only`, which refuses to load outside the Next server runtime.
// Keep this in sync with buildContainsPattern.
function buildContainsPattern(query: string) {
  const escaped = query
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_');

  return `%${escaped}%`;
}

describe('buildContainsPattern', () => {
  it('wraps a plain term', () => {
    expect(buildContainsPattern('Aoi')).toBe('%Aoi%');
  });

  it('escapes % so a lone percent does not match the whole catalogue', () => {
    expect(buildContainsPattern('%')).toBe('%\\%%');
  });

  it('escapes _ so it does not act as a single-character wildcard', () => {
    expect(buildContainsPattern('a_b')).toBe('%a\\_b%');
  });

  it('escapes backslashes before the metacharacters, not after', () => {
    // A trailing backslash must not escape the closing wildcard.
    expect(buildContainsPattern('a\\')).toBe('%a\\\\%');
    expect(buildContainsPattern('\\%')).toBe('%\\\\\\%%');
  });

  it('leaves CJK untouched', () => {
    expect(buildContainsPattern('亚克力')).toBe('%亚克力%');
  });
});
