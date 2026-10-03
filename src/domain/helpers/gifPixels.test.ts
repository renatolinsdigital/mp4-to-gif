import { describe, expect, test } from 'vitest';

import type { DitherMode } from '@/domain/types/conversion';

import {
  PaletteMatcher,
  changedRect,
  combinePaletteSamples,
  commitFramePixels,
  createScreenState,
  cropPixels,
  mapFramePixels,
  paletteError,
  type Palette,
  type ScreenState,
} from './gifPixels';

const BLACK_WHITE = [
  [0, 0, 0],
  [255, 255, 255],
];

function solid(width: number, height: number, value: number | number[]): Uint8ClampedArray {
  const [r, g, b] = typeof value === 'number' ? [value, value, value] : value;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([r ?? 0, g ?? 0, b ?? 0, 255], i);
  return data;
}

function mapFrame(
  rgba: Uint8ClampedArray,
  palette: Palette,
  options: {
    size?: number;
    dither?: DitherMode;
    threshold?: number;
    screen?: ScreenState;
    isFirstFrame?: boolean;
  } = {},
): Uint8Array {
  const size = options.size ?? 16;
  const matcher = new PaletteMatcher(palette);
  const screen = options.screen ?? createScreenState(size, size);
  const indices = mapFramePixels({
    rgba,
    width: size,
    height: size,
    matcher,
    dither: options.dither ?? 'off',
    screen,
    threshold: options.threshold ?? 0,
    transparentIndex: palette.length,
    isFirstFrame: options.isFirstFrame ?? true,
  });
  // Records the frame as shown, like the encoding session does after writing it.
  commitFramePixels({
    screen,
    width: size,
    rect: { left: 0, top: 0, width: size, height: size },
    indices,
    matcher,
    transparentIndex: palette.length,
  });
  return indices;
}

const share = (indices: Uint8Array, index: number) =>
  indices.filter((value) => value === index).length / indices.length;

describe('PaletteMatcher', () => {
  test('finds the nearest palette color', () => {
    const matcher = new PaletteMatcher([
      [0, 0, 0],
      [250, 10, 10],
      [10, 10, 250],
    ]);
    expect(matcher.nearest(200, 40, 30)).toBe(1);
    expect(matcher.nearest(20, 20, 20)).toBe(0);
  });

  test('palette error grows when the frame moves away from the palette colors', () => {
    const matcher = new PaletteMatcher([[200, 30, 30]]);
    expect(paletteError(solid(8, 8, [200, 30, 30]), matcher)).toBe(0);
    expect(paletteError(solid(8, 8, [20, 40, 220]), matcher)).toBeGreaterThan(1000);
  });
});

test('diffusion dithering mixes black and white evenly for a mid gray', () => {
  const indices = mapFrame(solid(16, 16, 128), BLACK_WHITE, { dither: 'diffusion' });
  expect(share(indices, 1)).toBeGreaterThan(0.4);
  expect(share(indices, 1)).toBeLessThan(0.6);
});

test.each(['diffusion', 'ordered'] as const)(
  '%s dithering keeps exact palette colors',
  (dither) => {
    const indices = mapFrame(solid(4, 4, 255), BLACK_WHITE, { size: 4, dither });
    expect(Array.from(indices).every((index) => index === 1)).toBe(true);
  },
);

test('ordered dithering mixes the two nearest colors for an in-between shade', () => {
  const grays = [
    [100, 100, 100],
    [150, 150, 150],
  ];
  const indices = mapFrame(solid(16, 16, 125), grays, { dither: 'ordered' });
  expect(share(indices, 1)).toBeGreaterThan(0.3);
  expect(share(indices, 1)).toBeLessThan(0.7);
});

test('ordered dithering leaves colors the palette nearly matches clean', () => {
  // Regression: a fixed-strength pattern used to crosshatch flat areas.
  const grays = [
    [100, 100, 100],
    [110, 110, 110],
  ];
  const indices = mapFrame(solid(16, 16, 101), grays, { dither: 'ordered' });
  expect(share(indices, 0)).toBe(1);
});

test('ordered dithering tiles the same pattern for the same input', () => {
  const grays = [
    [100, 100, 100],
    [150, 150, 150],
  ];
  const first = mapFrame(solid(16, 16, 125), grays, { dither: 'ordered' });
  const second = mapFrame(solid(16, 16, 125), grays, { dither: 'ordered' });
  expect(Array.from(second)).toEqual(Array.from(first));
  // The 8×8 pattern tiles: pixel (0, 0) matches pixel (8, 8).
  expect(first[8 * 16 + 8]).toBe(first[0]);
});

describe('unchanged pixels', () => {
  const palette = [
    [10, 10, 10],
    [200, 200, 200],
  ];
  const transparent = palette.length;

  test('repeated pixels become transparent after the first frame', () => {
    const screen = createScreenState(16, 16);
    const frame = solid(16, 16, 10);
    expect(share(mapFrame(frame, palette, { screen }), 0)).toBe(1);

    const next = mapFrame(frame, palette, { screen, isFirstFrame: false });
    expect(share(next, transparent)).toBe(1);
  });

  test('pixels that change color are redrawn', () => {
    const screen = createScreenState(16, 16);
    mapFrame(solid(16, 16, 10), palette, { screen });
    const next = mapFrame(solid(16, 16, 200), palette, { screen, isFirstFrame: false });
    expect(share(next, 1)).toBe(1);
  });

  test('without dithering, a threshold skips a slight change too', () => {
    const close = [
      [100, 100, 100],
      [104, 100, 100],
    ];
    const screen = createScreenState(16, 16);
    mapFrame(solid(16, 16, [100, 100, 100]), close, { screen });
    const next = mapFrame(solid(16, 16, [104, 100, 100]), close, {
      screen,
      threshold: 5,
      isFirstFrame: false,
    });
    expect(share(next, close.length)).toBe(1);
  });

  test.each(['diffusion', 'ordered'] as const)(
    'with %s dithering, still areas with slight source noise stay transparent',
    (dither) => {
      // Regression: dithering noise used to redraw still areas every frame.
      const screen = createScreenState(16, 16);
      mapFrame(solid(16, 16, 128), BLACK_WHITE, { dither, screen });
      const next = mapFrame(solid(16, 16, 130), BLACK_WHITE, {
        dither,
        screen,
        threshold: 4,
        isFirstFrame: false,
      });
      expect(share(next, BLACK_WHITE.length)).toBe(1);
    },
  );

  describe('within the threshold', () => {
    const faint = [
      [100, 100, 100],
      [110, 100, 100],
    ];

    test('a change that persists is still redrawn, so nothing is left behind', () => {
      // Regression: a faint line moving away within the threshold stayed on screen for good.
      const screen = createScreenState(16, 16);
      mapFrame(solid(16, 16, [110, 100, 100]), faint, { screen });
      const background = solid(16, 16, [100, 100, 100]);
      const options = { screen, threshold: 12, isFirstFrame: false };

      mapFrame(background, faint, options);
      expect(share(mapFrame(background, faint, options), 0)).toBe(1);
    });

    test('noise flickering around the drawn color stays transparent', () => {
      const screen = createScreenState(16, 16);
      mapFrame(solid(16, 16, [100, 100, 100]), faint, { screen });
      for (const red of [105, 95, 105, 95, 105]) {
        const next = mapFrame(solid(16, 16, [red, 100, 100]), faint, {
          screen,
          threshold: 12,
          isFirstFrame: false,
        });
        expect(share(next, faint.length)).toBe(1);
      }
    });
  });
});

describe('changed area', () => {
  const T = 9;

  test('is the smallest rectangle around every drawn pixel', () => {
    // 6×4 frame with drawn pixels at (1, 1) and (4, 2).
    const indices = new Uint8Array(24).fill(T);
    indices[1 * 6 + 1] = 0;
    indices[2 * 6 + 4] = 3;
    expect(changedRect(indices, 6, 4, T)).toEqual({ left: 1, top: 1, width: 4, height: 2 });
  });

  test('is null when nothing changed', () => {
    expect(changedRect(new Uint8Array(24).fill(T), 6, 4, T)).toBeNull();
  });

  test('crops a rectangle out of a frame buffer', () => {
    const rgb = Uint8Array.from({ length: 4 * 3 * 3 }, (_, i) => i);
    const cropped = cropPixels(rgb, 4, { left: 1, top: 1, width: 2, height: 2 }, 3);
    // Pixels (1, 1), (2, 1), (1, 2), (2, 2) of a 4-wide RGB frame.
    expect(Array.from(cropped)).toEqual([15, 16, 17, 18, 19, 20, 27, 28, 29, 30, 31, 32]);
  });
});

test('committing a frame records drawn pixels and leaves transparent ones as they were', () => {
  const screen = createScreenState(2, 1);
  screen.displayed.set([1, 2, 3, 4, 5, 6]);
  const matcher = new PaletteMatcher([[200, 100, 50]]);
  commitFramePixels({
    screen,
    width: 2,
    rect: { left: 0, top: 0, width: 2, height: 1 },
    indices: Uint8Array.of(0, 1),
    matcher,
    transparentIndex: 1,
  });
  expect(Array.from(screen.displayed)).toEqual([200, 100, 50, 4, 5, 6]);
});

test('palette samples are subsampled to stay under the pixel budget', () => {
  const samples = [solid(100, 100, 0), solid(100, 100, 255)];
  const combined = combinePaletteSamples(samples, 5000);
  expect(combined.length / 4).toBeLessThanOrEqual(5000);
  expect(combined).toContain(255);
});
