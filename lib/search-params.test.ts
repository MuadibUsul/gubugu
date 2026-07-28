import { describe, expect, it } from 'vitest';

import {
  getMultiSearchParamValues,
  getSingleSearchParamValue,
} from './search-params';

describe('getSingleSearchParamValue', () => {
  it('returns the first entry when a param repeats', () => {
    expect(getSingleSearchParamValue(['a', 'b'])).toBe('a');
  });

  it('passes through a lone string and undefined', () => {
    expect(getSingleSearchParamValue('a')).toBe('a');
    expect(getSingleSearchParamValue(undefined)).toBeUndefined();
  });

  it('returns undefined for an empty array', () => {
    expect(getSingleSearchParamValue([])).toBeUndefined();
  });
});

describe('getMultiSearchParamValues', () => {
  it('always returns an array', () => {
    expect(getMultiSearchParamValues(['a', 'b'])).toEqual(['a', 'b']);
    expect(getMultiSearchParamValues('a')).toEqual(['a']);
    expect(getMultiSearchParamValues(undefined)).toEqual([]);
  });

  it('drops an empty string instead of yielding a blank filter', () => {
    // /search builds tagSlugs from this, and a blank slug would become a
    // `tags.slug in ('')` predicate that silently matches nothing.
    expect(getMultiSearchParamValues('')).toEqual([]);
  });
});
