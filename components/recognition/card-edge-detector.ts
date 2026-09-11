import type { ScannerCorners } from './scanner-runtime';

export type CardGuide = { x: number; y: number; width: number; height: number };
type Edge = { slope: number; offset: number; score: number };

/** Search continuous borders near the fixed guide, ignoring detail inside the card. */
export function findGuidedCardCorners(
  image: { data: Uint8ClampedArray; width: number; height: number },
  guide: CardGuide,
): ScannerCorners | null {
  const { data, width, height } = image;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    gray[i] =
      0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  }
  function fit(horizontal: boolean, expected: number): Edge | null {
    const normalSize = horizontal ? height : width;
    const length = horizontal ? width : height;
    let best: Edge | null = null;
    // Search either side of the guide; the user need not align with it exactly.
    for (
      let center = Math.max(4, expected - normalSize * 0.14);
      center < Math.min(normalSize - 4, expected + normalSize * 0.14);
      center += 2
    ) {
      for (let tilt = -length * 0.1; tilt <= length * 0.1; tilt += 2) {
        let score = 0;
        let supported = 0;
        for (let i = 0; i < 40; i++) {
          const t = 0.15 + (i / 39) * 0.7;
          const along = Math.round(t * (length - 1));
          const normal = Math.round(center + tilt * (t - 0.5));
          if (normal < 3 || normal >= normalSize - 3) continue;
          const before = horizontal
            ? (normal - 2) * width + along
            : along * width + normal - 2;
          const after = horizontal
            ? (normal + 2) * width + along
            : along * width + normal + 2;
          const contrast = Math.abs(gray[before] - gray[after]);
          score += Math.min(contrast, 48);
          if (contrast > 12) supported++;
        }
        score /= 40;
        if (supported >= 24 && score >= 14 && (!best || score > best.score)) {
          best = {
            slope: tilt / (length - 1),
            offset: center - tilt / 2,
            score,
          };
        }
      }
    }
    return best;
  }
  const left = fit(false, guide.x);
  const right = fit(false, guide.x + guide.width);
  const top = fit(true, guide.y);
  const bottom = fit(true, guide.y + guide.height);
  if (!left || !right || !top || !bottom) return null;
  function intersection(vertical: Edge, horizontal: Edge) {
    const x =
      (vertical.offset + vertical.slope * horizontal.offset) /
      (1 - vertical.slope * horizontal.slope);
    return { x, y: horizontal.offset + horizontal.slope * x };
  }
  const corners = {
    topLeftCorner: intersection(left, top),
    topRightCorner: intersection(right, top),
    bottomRightCorner: intersection(right, bottom),
    bottomLeftCorner: intersection(left, bottom),
  };
  if (
    Object.values(corners).some(
      (p) => p.x < 0 || p.y < 0 || p.x >= width || p.y >= height,
    )
  )
    return null;
  return corners;
}

/** Pick the sharpest of a short burst without a device-specific blur threshold. */
export function cardSharpness(image: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}) {
  const { data, width, height } = image;
  let total = 0;
  let count = 0;
  for (let y = Math.floor(height * 0.2); y < height * 0.8; y += 2) {
    for (let x = Math.floor(width * 0.2); x < width * 0.8; x += 2) {
      const i = (y * width + x) * 4;
      const d =
        data[i] * 4 -
        data[i - 4] -
        data[i + 4] -
        data[i - width * 4] -
        data[i + width * 4];
      total += d * d;
      count++;
    }
  }
  return count ? total / count : 0;
}
