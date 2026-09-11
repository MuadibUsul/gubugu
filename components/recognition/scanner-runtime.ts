'use client';

export type CvMat = { delete: () => void };
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
type OpenCvLike = {
  Mat?: unknown;
  imread: (el: HTMLCanvasElement) => CvMat;
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

  if (coverage < 0.22)
    return { good: false, reason: 'small', coverage, center };
  if (coverage > 0.78)
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
  const cardLikeRatio = shortLongRatio >= 0.55 && shortLongRatio <= 0.86;

  if (!oppositeSidesBalanced || !cornersAreSquare || !cardLikeRatio) {
    return { good: false, reason: 'shape', coverage, center };
  }
  return { good: true, reason: 'good', coverage, center };
}

let openCvPromise: Promise<void> | null = null;

export function ensureOpenCV(): Promise<void> {
  if (openCvPromise) return openCvPromise;

  openCvPromise = new Promise<void>((resolve, reject) => {
    const browserWindow = window as unknown as {
      cv?: { Mat?: unknown; onRuntimeInitialized?: () => void };
    };
    if (browserWindow.cv?.Mat) return resolve();

    const finish = () => {
      if (browserWindow.cv?.Mat) resolve();
      else if (browserWindow.cv) {
        browserWindow.cv.onRuntimeInitialized = () => resolve();
      } else reject(new Error('OpenCV 未就绪'));
    };
    const existing = document.getElementById(
      'opencv-js',
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', finish);
      existing.addEventListener('error', () =>
        reject(new Error('OpenCV 加载失败')),
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'opencv-js';
    script.async = true;
    script.src = '/vendor/opencv.js';
    script.onload = finish;
    script.onerror = () => reject(new Error('OpenCV 加载失败'));
    document.head.appendChild(script);
  });

  return openCvPromise;
}

let scannerPromise: Promise<import('jscanify/client').default> | null = null;

export function ensureScanner() {
  if (!scannerPromise) {
    scannerPromise = (async () => {
      await ensureOpenCV();
      const Jscanify = (await import('jscanify/client')).default;
      return new Jscanify();
    })();
  }
  return scannerPromise;
}

export function getReadyCv(): OpenCvLike | null {
  const browserWindow = window as unknown as { cv?: OpenCvLike };
  return browserWindow.cv?.Mat ? browserWindow.cv : null;
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
