/**
 * Accepts a string as well as a Date because the schema's type does not match
 * what arrives at runtime: `date('release_date', { mode: 'date' })` is typed as
 * Date, but node-postgres hands a `date` column back as a 'YYYY-MM-DD' string.
 * Calling Date methods on it threw and took down the whole SKU info panel.
 *
 * An invalid Date is also an object, so it survives a null check and then makes
 * Intl.format throw RangeError — both cases fall back instead.
 */
export function formatCatalogDate(value: Date | string | null | undefined) {
  if (!value) {
    return '暂未收录';
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '暂未收录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatCatalogCurrency(
  amount: string | null,
  currencyCode: string | null,
) {
  if (!amount || !currencyCode) {
    return '待补充';
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount)) {
    return `${amount} ${currencyCode}`;
  }

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}
