import { describe, expect, it } from 'vitest';

import {
  clampFrameSize,
  evaluateCardFrame,
  expandSourceRect,
  getCoverSourceRect,
  mapCoverPoint,
} from './scanner-runtime';

describe('scanner geometry', () => {
  it('centres a 4:5 crop in landscape and portrait frames', () => {
    expect(clampFrameSize(1000, 1000)).toEqual({
      sx: 100,
      sy: 0,
      sw: 800,
      sh: 1000,
    });
    expect(clampFrameSize(800, 1200)).toEqual({
      sx: 0,
      sy: 100,
      sw: 800,
      sh: 1000,
    });
  });

  it('maps detection points through an object-fit cover transform', () => {
    expect(mapCoverPoint(160, 120, 320, 240, 400, 400)).toEqual({
      x: 200,
      y: 200,
    });
  });

  it('maps the visible guide to the matching source-video crop', () => {
    const crop = getCoverSourceRect(1920, 1440, 360, 640, {
      x: 45,
      y: 120,
      width: 270,
      height: 337.5,
    });
    expect(crop.sx).toBeCloseTo(656.25);
    expect(crop.sy).toBeCloseTo(270);
    expect(crop.sw).toBeCloseTo(607.5);
    expect(crop.sh).toBeCloseTo(759.375);
  });

  it('keeps a detection margin around the visual guide', () => {
    expect(
      expandSourceRect({ sx: 100, sy: 200, sw: 500, sh: 700 }, 1000, 1200),
    ).toEqual({ sx: 80, sy: 172, sw: 540, sh: 756 });
    expect(
      expandSourceRect({ sx: 0, sy: 0, sw: 500, sh: 700 }, 500, 700),
    ).toEqual({ sx: 0, sy: 0, sw: 500, sh: 700 });
  });

  it('accepts real card perspective and rejects tiny or very thin rectangles', () => {
    expect(
      evaluateCardFrame(
        {
          topLeftCorner: { x: 28, y: 25 },
          topRightCorner: { x: 228, y: 25 },
          bottomRightCorner: { x: 228, y: 295 },
          bottomLeftCorner: { x: 28, y: 295 },
        },
        256,
        320,
      ).good,
    ).toBe(true);
    expect(
      evaluateCardFrame(
        {
          topLeftCorner: { x: 28, y: 60 },
          topRightCorner: { x: 228, y: 60 },
          bottomRightCorner: { x: 228, y: 260 },
          bottomLeftCorner: { x: 28, y: 260 },
        },
        256,
        320,
      ).good,
    ).toBe(true);
    expect(
      evaluateCardFrame(
        {
          topLeftCorner: { x: 30, y: 70 },
          topRightCorner: { x: 290, y: 70 },
          bottomRightCorner: { x: 290, y: 170 },
          bottomLeftCorner: { x: 30, y: 170 },
        },
        320,
        240,
      ).reason,
    ).toBe('shape');
    expect(
      evaluateCardFrame(
        {
          topLeftCorner: { x: 20, y: 20 },
          topRightCorner: { x: 236, y: 100 },
          bottomRightCorner: { x: 200, y: 300 },
          bottomLeftCorner: { x: 45, y: 240 },
        },
        256,
        320,
      ).good,
    ).toBe(true);
    expect(
      evaluateCardFrame(
        {
          topLeftCorner: { x: 30, y: 100 },
          topRightCorner: { x: 290, y: 100 },
          bottomRightCorner: { x: 290, y: 150 },
          bottomLeftCorner: { x: 30, y: 150 },
        },
        320,
        240,
      ).reason,
    ).toBe('small');
  });
});
