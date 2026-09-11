'use client';

export type ScannerPoint = { x: number; y: number };
export type ScannerCorners = {
  topLeftCorner: ScannerPoint;
  topRightCorner: ScannerPoint;
  bottomRightCorner: ScannerPoint;
  bottomLeftCorner: ScannerPoint;
};

export type CardFrameEvaluation = {
  good: boolean;
  reason: 'small' | 'large' | 'off-center' | 'shape' | 'good';
  coverage: number;
  center: ScannerPoint;
};

export function clampFrameSize(sw: number, sh: number) {
  const target = 4 / 5;
  if (sw / sh > target) {
    const width = sh * target;
    return { sx: (sw - width) / 2, sy: 0, sw: width, sh };
  }
  const height = sw / target;
  return { sx: 0, sy: (sh - height) / 2, sw, sh: height };
}

/** Map a visible guide through an object-fit: cover video to source pixels. */
export function getCoverSourceRect(
  frameWidth: number,
  frameHeight: number,
  viewWidth: number,
  viewHeight: number,
  guide: { x: number; y: number; width: number; height: number },
) {
  const scale = Math.max(viewWidth / frameWidth, viewHeight / frameHeight);
  const offsetX = (viewWidth - frameWidth * scale) / 2;
  const offsetY = (viewHeight - frameHeight * scale) / 2;
  const sx = Math.max(0, (guide.x - offsetX) / scale);
  const sy = Math.max(0, (guide.y - offsetY) / scale);
  return {
    sx,
    sy,
    sw: Math.min(frameWidth - sx, guide.width / scale),
    sh: Math.min(frameHeight - sy, guide.height / scale),
  };
}

/** Add a small invisible margin so edges touching the visual guide stay detectable. */
export function expandSourceRect(
  rect: { sx: number; sy: number; sw: number; sh: number },
  frameWidth: number,
  frameHeight: number,
  fraction = 0.04,
) {
  const padX = rect.sw * fraction;
  const padY = rect.sh * fraction;
  const sx = Math.max(0, rect.sx - padX);
  const sy = Math.max(0, rect.sy - padY);
  return {
    sx,
    sy,
    sw: Math.min(frameWidth - sx, rect.sw + padX * 2),
    sh: Math.min(frameHeight - sy, rect.sh + padY * 2),
  };
}

function distance(a: ScannerPoint, b: ScannerPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function cornerCosine(
  before: ScannerPoint,
  corner: ScannerPoint,
  after: ScannerPoint,
) {
  const ax = before.x - corner.x;
  const ay = before.y - corner.y;
  const bx = after.x - corner.x;
  const by = after.y - corner.y;
  const denominator = Math.hypot(ax, ay) * Math.hypot(bx, by);
  return denominator === 0 ? 1 : Math.abs((ax * bx + ay * by) / denominator);
}

/** Strict geometry gate for automatic capture; manual capture remains available. */
export function evaluateCardFrame(
  corners: ScannerCorners,
  frameWidth: number,
  frameHeight: number,
): CardFrameEvaluation {
  const { topLeftCorner: tl, topRightCorner: tr } = corners;
  const { bottomRightCorner: br, bottomLeftCorner: bl } = corners;
  const area =
    Math.abs(
      tl.x * tr.y -
        tr.x * tl.y +
        tr.x * br.y -
        br.x * tr.y +
        br.x * bl.y -
        bl.x * br.y +
        bl.x * tl.y -
        tl.x * bl.y,
    ) / 2;
  const coverage = area / (frameWidth * frameHeight);
  const center = {
    x: (tl.x + tr.x + br.x + bl.x) / 4,
    y: (tl.y + tr.y + br.y + bl.y) / 4,
  };
  const offCenter = Math.hypot(
    center.x / frameWidth - 0.5,
    center.y / frameHeight - 0.5,
  );

  if (coverage < 0.45)
    return { good: false, reason: 'small', coverage, center };
  if (coverage > 0.96)
    return { good: false, reason: 'large', coverage, center };
  if (offCenter > 0.16) {
    return { good: false, reason: 'off-center', coverage, center };
  }

  const top = distance(tl, tr);
  const right = distance(tr, br);
  const bottom = distance(bl, br);
  const left = distance(tl, bl);
  const width = (top + bottom) / 2;
  const height = (left + right) / 2;
  const shortLongRatio = Math.min(width, height) / Math.max(width, height);
  const oppositeSidesBalanced =
    Math.min(top, bottom) / Math.max(top, bottom) >= 0.78 &&
    Math.min(left, right) / Math.max(left, right) >= 0.78;
  const cornersAreSquare =
    Math.max(
      cornerCosine(bl, tl, tr),
      cornerCosine(tl, tr, br),
      cornerCosine(tr, br, bl),
      cornerCosine(br, bl, tl),
    ) <= 0.3;
  // 谷子既有竖卡，也有接近正方形的色纸、拍立得和亚克力制品。
  const cardLikeRatio = shortLongRatio >= 0.55;

  if (!oppositeSidesBalanced || !cornersAreSquare || !cardLikeRatio) {
    return { good: false, reason: 'shape', coverage, center };
  }
  return { good: true, reason: 'good', coverage, center };
}

let scannerPromise: Promise<import('scanic').Scanner> | null = null;

export function ensureScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      const { Scanner } = await import('scanic');
      const scanner = new Scanner({
        detector: 'classical',
        useWasmFullCanny: true,
        enableDetectionCascade: true,
      });
      await scanner.initialize();
      return scanner;
    })();
  }
  return scannerPromise;
}

export function mapCoverPoint(
  x: number,
  y: number,
  frameWidth: number,
  frameHeight: number,
  viewWidth: number,
  viewHeight: number,
) {
  const scale = Math.max(viewWidth / frameWidth, viewHeight / frameHeight);
  const displayWidth = frameWidth * scale;
  const displayHeight = frameHeight * scale;

  return {
    x: x * scale + (viewWidth - displayWidth) / 2,
    y: y * scale + (viewHeight - displayHeight) / 2,
  };
}
