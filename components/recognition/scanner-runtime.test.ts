import { describe, expect, it } from 'vitest';

import {
  clampFrameSize,
  evaluateCardFrame,
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

  it('accepts a centred card and rejects broad or skewed rectangles', () => {
    expect(
      evaluateCardFrame(
        {
          topLeftCorner: { x: 85, y: 30 },
          topRightCorner: { x: 235, y: 30 },
          bottomRightCorner: { x: 235, y: 210 },
          bottomLeftCorner: { x: 85, y: 210 },
        },
        320,
        240,
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
          topLeftCorner: { x: 80, y: 30 },
          topRightCorner: { x: 240, y: 55 },
          bottomRightCorner: { x: 205, y: 210 },
          bottomLeftCorner: { x: 115, y: 175 },
        },
        320,
        240,
      ).reason,
    ).toBe('shape');
  });
});
