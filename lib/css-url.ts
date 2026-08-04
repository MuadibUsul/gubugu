// Image URLs reach the cards as free text from goods_images.image_url, which is
// filled in through the admin editor. Interpolating one straight into
// `url(...)` means a URL containing a space, parenthesis or quote produces an
// invalid declaration that the CSSOM drops, so the image silently disappears.
// Quoting and escaping keeps those URLs renderable.
export function toCssUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const trimmed = url.trim();

  if (trimmed.length === 0) {
    return null;
  }

  // Newlines terminate a CSS string outright, so they cannot be escaped into a
  // valid value; a URL containing one is not usable here.
  if (/[\n\r\f]/.test(trimmed)) {
    return null;
  }

  const escaped = trimmed.replaceAll('\\', '\\\\').replaceAll('"', '\\"');

  return `url("${escaped}")`;
}
