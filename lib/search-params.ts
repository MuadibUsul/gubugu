export function getSingleSearchParamValue(
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function getMultiSearchParamValues(
  value: string | string[] | undefined,
) {
  if (Array.isArray(value)) {
    return value;
  }

  return value ? [value] : [];
}
