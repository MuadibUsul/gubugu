import { describe, expect, it } from 'vitest';

import { cardSharpness, findGuidedCardCorners } from './card-edge-detector';

const width = 320;
const height = 460;
const guide = { x: 26, y: 49, width: 268, height: 389 };

function pixels(value: (x: number, y: number) => number) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = value(x, y);
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe('guided card extraction', () => {
  it('finds all four borders with perspective and artwork inside the card', () => {
    const image = pixels((x, y) => {
      const inside =
        x > 20 + y * 0.01 &&
        x < 295 - y * 0.01 &&
        y > 35 - x * 0.02 &&
        y < 430 + x * 0.02;
      return inside ? 150 + ((x * 13 + y * 7) % 80) : 30;
    });
    const corners = findGuidedCardCorners(image, guide);
    expect(corners).not.toBeNull();
    expect(Math.abs(corners!.topLeftCorner.x - 20)).toBeLessThan(5);
    expect(Math.abs(corners!.topLeftCorner.y - 35)).toBeLessThan(5);
    expect(Math.abs(corners!.bottomRightCorner.x - 291)).toBeLessThan(5);
    expect(Math.abs(corners!.bottomRightCorner.y - 436)).toBeLessThan(5);
  });

  it('does not capture a blank surface or a single background edge', () => {
    expect(
      findGuidedCardCorners(
        pixels(() => 120),
        guide,
      ),
    ).toBeNull();
    expect(
      findGuidedCardCorners(
        pixels((x) => (x < 25 ? 30 : 200)),
        guide,
      ),
    ).toBeNull();
  });

  it('does not treat detail in the centre as complete card borders', () => {
    const image = pixels((x, y) =>
      x > 90 && x < 230 && y > 150 && y < 300 ? (x * 11 + y * 17) % 256 : 100,
    );
    expect(findGuidedCardCorners(image, guide)).toBeNull();
  });

  it('prefers the sharper image in a short burst', () => {
    const sharp = pixels((x, y) => ((x + y) % 4 < 2 ? 0 : 255));
    const blurred = pixels(() => 128);
    expect(cardSharpness(sharp)).toBeGreaterThan(cardSharpness(blurred));
  });
});
