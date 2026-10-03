import { describe, expect, test } from 'vitest';

import { Resampler, halvingSteps } from './resample';

function frame(width: number, height: number, pixel: (x: number, y: number) => number[]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) data.set([...pixel(x, y), 255], (y * width + x) * 4);
  }
  return data;
}

const channel = (data: Uint8ClampedArray, width: number, x: number, y: number) =>
  data[(y * width + x) * 4] as number;

describe('Resampler', () => {
  test('keeps a flat color exactly', () => {
    const out = new Resampler({ width: 30, height: 20 }, { width: 17, height: 11 }).resize(
      frame(30, 20, () => [12, 200, 77]),
    );
    expect(out).toHaveLength(17 * 11 * 4);
    for (let i = 0; i < out.length; i += 4) {
      expect(Array.from(out.subarray(i, i + 4))).toEqual([12, 200, 77, 255]);
    }
  });

  test('averages detail finer than the output instead of aliasing it', () => {
    // A 1-pixel checkerboard. Point sampling would turn it into solid black or white
    // patches (moiré); a proper filter turns it into even gray.
    const checker = frame(64, 64, (x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0]));
    const out = new Resampler({ width: 64, height: 64 }, { width: 21, height: 21 }).resize(checker);
    for (let y = 2; y < 19; y++) {
      for (let x = 2; x < 19; x++) {
        expect(Math.abs(channel(out, 21, x, y) - 128)).toBeLessThan(12);
      }
    }
  });

  test('keeps a hard edge crisp', () => {
    const edge = frame(40, 4, (x) => (x < 20 ? [0, 0, 0] : [255, 255, 255]));
    const out = new Resampler({ width: 40, height: 4 }, { width: 20, height: 2 }).resize(edge);
    const row = Array.from({ length: 20 }, (_, x) => channel(out, 20, x, 1));
    // Flat away from the edge, with the jump confined to the pixels next to it.
    expect(row.slice(0, 8).every((v) => v < 8)).toBe(true);
    expect(row.slice(12).every((v) => v > 247)).toBe(true);
    expect((row[11] as number) - (row[8] as number)).toBeGreaterThan(200);
  });
});

describe('halvingSteps', () => {
  test.each([
    [
      { width: 1920, height: 1080 },
      { width: 480, height: 270 },
      [
        [960, 540],
        [480, 270],
      ],
    ],
    [{ width: 1920, height: 1080 }, { width: 720, height: 405 }, [[960, 540]]],
    [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, []],
    [{ width: 1920, height: 1080 }, { width: 1920, height: 1080 }, []],
    [{ width: 406, height: 720 }, { width: 203, height: 360 }, [[203, 360]]],
  ])('%o to %o halves through %o', (source, target, expected) => {
    expect(halvingSteps(source, target).map(({ width, height }) => [width, height])).toEqual(
      expected,
    );
  });

  test('never steps below the target', () => {
    const target = { width: 301, height: 169 };
    const last = halvingSteps({ width: 1920, height: 1080 }, target).at(-1);
    expect(last?.width).toBeGreaterThanOrEqual(target.width);
    expect(last?.height).toBeGreaterThanOrEqual(target.height);
  });
});
