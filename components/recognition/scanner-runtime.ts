'use client';

import {
  cardSharpness,
  findGuidedCardCorners,
  type CardGuide,
} from './card-edge-detector';

export type ScannerPoint = { x: number; y: number };
export type ScannerCorners = {
  topLeftCorner: ScannerPoint;
  topRightCorner: ScannerPoint;
  bottomRightCorner: ScannerPoint;
  bottomLeftCorner: ScannerPoint;
};

/** Small colour sample inside the detected card, independent of its screen position. */
export function fingerprintCard(
  frame: HTMLCanvasElement,
  corners: ScannerCorners,
) {
  const ctx = frame.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  const { data } = ctx.getImageData(0, 0, frame.width, frame.height);
  const values: number[] = [];
  const {
    topLeftCorner: tl,
    topRightCorner: tr,
    bottomLeftCorner: bl,
    bottomRightCorner: br,
  } = corners;
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const u = 0.15 + (x / 7) * 0.7,
        v = 0.15 + (y / 7) * 0.7;
      const px = Math.max(
        0,
        Math.min(
          frame.width - 1,
          Math.round(
            (tl.x * (1 - u) + tr.x * u) * (1 - v) +
              (bl.x * (1 - u) + br.x * u) * v,
          ),
        ),
      );
      const py = Math.max(
        0,
        Math.min(
          frame.height - 1,
          Math.round(
            (tl.y * (1 - u) + tr.y * u) * (1 - v) +
              (bl.y * (1 - u) + br.y * u) * v,
          ),
        ),
      );
      const i = (py * frame.width + px) * 4;
      values.push(data[i], data[i + 1], data[i + 2]);
    }
  return values;
}

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

/** Practical auto-capture gate; the detector already validates the quadrilateral. */
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

  if (coverage < 0.3) return { good: false, reason: 'small', coverage, center };
  if (coverage > 0.995)
    return { good: false, reason: 'large', coverage, center };
  if (offCenter > 0.25) {
    return { good: false, reason: 'off-center', coverage, center };
  }

  const top = distance(tl, tr);
  const right = distance(tr, br);
  const bottom = distance(bl, br);
  const left = distance(tl, bl);
  const width = (top + bottom) / 2;
  const height = (left + right) / 2;
  const shortLongRatio = Math.min(width, height) / Math.max(width, height);
  // 只排除明显的细长误检；透视、圆角、反光和接近正方形的谷子都允许。
  if (shortLongRatio < 0.4) {
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

export async function detectCardFrame(
  frame: HTMLCanvasElement,
  guide: CardGuide,
) {
  const small = document.createElement('canvas');
  small.width = 320;
  small.height = Math.round((frame.height * small.width) / frame.width);
  const ctx = small.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(frame, 0, 0, small.width, small.height);
  const pixels = ctx.getImageData(0, 0, small.width, small.height);
  const scaleX = small.width / frame.width,
    scaleY = small.height / frame.height;
  let corners = findGuidedCardCorners(pixels, {
    x: guide.x * scaleX,
    y: guide.y * scaleY,
    width: guide.width * scaleX,
    height: guide.height * scaleY,
  });
  if (!corners) {
    const scanner = await ensureScanner();
    const result = await scanner.scan(small, {
      mode: 'detect',
      maxProcessingDimension: 480,
    });
    if (result.success && result.corners && (result.confidence ?? 0) >= 0.7) {
      corners = {
        topLeftCorner: result.corners.topLeft,
        topRightCorner: result.corners.topRight,
        bottomLeftCorner: result.corners.bottomLeft,
        bottomRightCorner: result.corners.bottomRight,
      };
    }
  }
  if (!corners || !evaluateCardFrame(corners, small.width, small.height).good)
    return null;
  // Border-touching detections often include a background object cut off by the camera.
  if (
    Object.values(corners).some(
      (p) =>
        p.x < 1 || p.y < 1 || p.x >= small.width - 1 || p.y >= small.height - 1,
    )
  )
    return null;
  const scale = (p: ScannerPoint) => ({ x: p.x / scaleX, y: p.y / scaleY });
  return {
    corners: {
      topLeftCorner: scale(corners.topLeftCorner),
      topRightCorner: scale(corners.topRightCorner),
      bottomLeftCorner: scale(corners.bottomLeftCorner),
      bottomRightCorner: scale(corners.bottomRightCorner),
    },
    sharpness: cardSharpness(pixels),
  };
}

export async function extractCardFrame(
  frame: HTMLCanvasElement,
  corners: ScannerCorners,
) {
  const { extractDocument } = await import('scanic');
  const result = await extractDocument(
    frame,
    {
      topLeft: corners.topLeftCorner,
      topRight: corners.topRightCorner,
      bottomRight: corners.bottomRightCorner,
      bottomLeft: corners.bottomLeftCorner,
    },
    { output: 'canvas' },
  );
  if (!result.success || !(result.output instanceof HTMLCanvasElement))
    throw new Error('卡片裁切失败，请重新拍摄。');
  return result.output;
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
