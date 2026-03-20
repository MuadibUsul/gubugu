export function formatCatalogDate(value: Date | null) {
  if (!value) {
    return '暂未收录';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
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
