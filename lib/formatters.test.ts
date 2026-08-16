import { describe, expect, it } from 'vitest';

import { formatCatalogCurrency, formatCatalogDate } from './formatters';

// Assertions avoid pinning exact Intl output, which shifts with the ICU data
// bundled in each Node release. What matters is the branch taken and that the
// value survives into the string.

describe('formatCatalogDate', () => {
  it('falls back when the date is missing', () => {
    expect(formatCatalogDate(null)).toBe('暂未收录');
  });

  it('formats a real date and keeps the year', () => {
    const formatted = formatCatalogDate(new Date('2024-03-05T00:00:00Z'));

    expect(formatted).not.toBe('暂未收录');
    expect(formatted).toContain('2024');
  });
});

describe('formatCatalogCurrency', () => {
  it('falls back when the amount is missing', () => {
    expect(formatCatalogCurrency(null, 'CNY')).toBe('待补充');
  });

  it('falls back when the currency code is missing', () => {
    expect(formatCatalogCurrency('120', null)).toBe('待补充');
  });

  it('falls back on an empty amount rather than formatting it as zero', () => {
    expect(formatCatalogCurrency('', 'CNY')).toBe('待补充');
  });

  // '0' is a truthy string, so a real zero price must survive the guard that
  // rejects empty ones and be formatted rather than reported as missing.
  it('formats a zero price instead of treating it as absent', () => {
    const formatted = formatCatalogCurrency('0', 'CNY');

    expect(formatted).not.toBe('待补充');
    expect(formatted).toContain('0');
  });

  it('formats a normal amount', () => {
    const formatted = formatCatalogCurrency('1280.5', 'CNY');

    expect(formatted).toContain('1,280.5');
  });

  it('passes a non-numeric amount through with its currency code', () => {
    expect(formatCatalogCurrency('询价', 'CNY')).toBe('询价 CNY');
  });

  it('passes Infinity through rather than rendering it as a price', () => {
    expect(formatCatalogCurrency('Infinity', 'JPY')).toBe('Infinity JPY');
  });
});
