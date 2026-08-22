export const acceptedImageMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const acceptedImageInputValue = acceptedImageMimeTypes.join(',');

export function isAcceptedImageMimeType(value: string) {
  return acceptedImageMimeTypes.some((type) => type === value.toLowerCase());
}
