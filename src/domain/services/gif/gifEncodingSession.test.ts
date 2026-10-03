import { describe, expect, test } from 'vitest';

import { QUALITY_PRESET_ORDER, resolveEncoding } from '@/domain/helpers/qualityPresets';
import type { QualityPreset, QualityTuning } from '@/domain/types/conversion';
import { decodeGif } from '@/tests/gifDecoder';

import { GifEncodingSession, type GifEncodingOptions } from './gifEncodingSession';

const WIDTH = 32;
const HEIGHT = 24;

type Rgb = [number, number, number];

function gradientFrame(shift: number, width = WIDTH, height = HEIGHT): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data.set([(x * 8 + shift) % 256, y * 10, 128, 255], i);
    }
  }
  return data;
}

function solidFrame(rgb: Rgb, width = WIDTH, height = HEIGHT): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) data.set([...rgb, 255], i);
  return data;
}

function encode(options: GifEncodingOptions, frames: Uint8ClampedArray[]): Uint8Array {
  const session = new GifEncodingSession(options);
  if (options.paletteMode === 'global') session.setGlobalPalette(frames.slice(0, 2));
  for (const frame of frames) session.addFrame(frame, 100);
  return session.finish();
}

function optionsFor(
  preset: QualityPreset,
  repeat = 0,
  tuning: QualityTuning = {},
): GifEncodingOptions {
  return { width: WIDTH, height: HEIGHT, repeat, ...resolveEncoding(preset, tuning) };
}

/** Largest per-channel difference between a decoded canvas (RGB) and a source frame (RGBA). */
function maxError(canvas: Uint8Array, rgba: Uint8ClampedArray): number {
  let max = 0;
  for (let p = 0; p < canvas.length / 3; p++) {
    for (let c = 0; c < 3; c++) {
      max = Math.max(max, Math.abs((canvas[p * 3 + c] as number) - (rgba[p * 4 + c] as number)));
    }
  }
  return max;
}

describe.each(QUALITY_PRESET_ORDER)('%s preset', (preset) => {
  test('produces a decodable GIF that shows the source frames', () => {
    const frames = [gradientFrame(0), gradientFrame(16), gradientFrame(32)];
    const gif = decodeGif(encode(optionsFor(preset), frames));

    expect(gif.width).toBe(WIDTH);
    expect(gif.height).toBe(HEIGHT);
    expect(gif.frames).toHaveLength(3);
    // Color error stays within what quantizing to the preset's palette can explain.
    gif.frames.forEach((frame, i) => {
      expect(maxError(frame.canvas, frames[i] as Uint8ClampedArray)).toBeLessThan(64);
    });
  });
});

test('infinite loop writes the NETSCAPE extension; play-once omits it', () => {
  const frames = [gradientFrame(0), gradientFrame(8)];
  expect(decodeGif(encode(optionsFor('medium', 0), frames)).loopCount).toBe(0);
  expect(decodeGif(encode(optionsFor('medium', -1), frames)).loopCount).toBeNull();
});

test('a static scene is much smaller than one that changes every frame', () => {
  const still = encode(
    optionsFor('high'),
    Array.from({ length: 6 }, () => gradientFrame(0)),
  );
  const moving = encode(
    optionsFor('high'),
    Array.from({ length: 6 }, (_, i) => gradientFrame(i * 40)),
  );
  expect(still.length).toBeLessThan(moving.length * 0.6);
});

test.each(['off', 'ordered', 'diffusion'] as const)(
  'tuned dithering "%s" encodes a valid GIF',
  (dither) => {
    const gif = decodeGif(
      encode(optionsFor('medium', 0, { dither, maxColors: 64 }), [
        gradientFrame(0),
        gradientFrame(16),
      ]),
    );
    expect(gif.frames).toHaveLength(2);
  },
);

test('the adaptive palette is rebuilt when the scene changes colors', () => {
  const red: Rgb = [200, 30, 30];
  const blue: Rgb = [20, 40, 220];
  const gif = decodeGif(
    encode(optionsFor('high'), [solidFrame(red), solidFrame(red), solidFrame(blue)]),
  );
  const last = gif.frames.at(-1);
  expect(last?.hasLocalPalette).toBe(true);
  expect(maxError(last?.canvas as Uint8Array, solidFrame(blue))).toBeLessThan(8);
});

test('the adaptive palette is kept while it still fits, so no extra color tables are written', () => {
  const frames = [gradientFrame(0), gradientFrame(1), gradientFrame(2), gradientFrame(3)];
  const gif = decodeGif(encode(optionsFor('high'), frames));
  expect(gif.frames.filter((frame) => frame.hasLocalPalette)).toHaveLength(0);
});

test('later frames only store the area that changed', () => {
  const first = solidFrame([30, 60, 90]);
  const second = first.slice();
  // A 3×2 patch at (10, 5) turns white.
  for (let y = 5; y < 7; y++) {
    for (let x = 10; x < 13; x++) second.set([255, 255, 255, 255], (y * WIDTH + x) * 4);
  }
  const gif = decodeGif(encode(optionsFor('high', 0, { lossy: 'off' }), [first, second]));

  expect(gif.frames[0]?.rect).toEqual({ left: 0, top: 0, width: WIDTH, height: HEIGHT });
  expect(gif.frames[1]?.rect).toEqual({ left: 10, top: 5, width: 3, height: 2 });
  expect(maxError(gif.frames[1]?.canvas as Uint8Array, second)).toBeLessThan(8);
});

test('a faint line that moves away leaves no trace behind', () => {
  // Regression: lines fainter than the pixel-skip threshold stayed on screen after moving
  // and piled up as scratches across the GIF.
  const frameWithLine = (lineX: number, step: number) => {
    const frame = solidFrame([100, 100, 100]);
    for (let y = 0; y < HEIGHT; y++) frame.set([110, 100, 100, 255], (y * WIDTH + lineX) * 4);
    // Corners that change every frame make each frame span the canvas, as in real footage.
    const corner = step % 2 === 0 ? 0 : 255;
    frame.set([corner, corner, corner, 255], 0);
    frame.set([corner, corner, corner, 255], (WIDTH * HEIGHT - 1) * 4);
    return frame;
  };
  const frames = [frameWithLine(8, 0), ...[1, 2, 3, 4].map((step) => frameWithLine(24, step))];
  const canvas = decodeGif(encode(optionsFor('medium'), frames)).frames.at(-1)?.canvas;

  for (let y = 1; y < HEIGHT - 1; y++) {
    expect(Math.abs((canvas?.[(y * WIDTH + 8) * 3] as number) - 100)).toBeLessThan(5);
  }
});

test('a frame identical to the previous one extends its delay instead of being stored', () => {
  const session = new GifEncodingSession(optionsFor('low'));
  session.addFrame(gradientFrame(0), 100);
  session.addFrame(gradientFrame(0), 100);
  session.addFrame(gradientFrame(0), 50);
  session.addFrame(gradientFrame(40), 100);
  expect(session.framesWritten).toBe(2);

  const gif = decodeGif(session.finish());
  expect(gif.frames.map((frame) => frame.delayCs)).toEqual([25, 10]);
});

test('lossy compression keeps every pixel within its tolerance and shrinks noisy frames', () => {
  // Fine noise: the hardest case for LZW, where approximate matches pay off most.
  const noisy = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  let seed = 7;
  for (let i = 0; i < noisy.length; i += 4) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const v = 100 + ((seed >>> 16) % 40);
    noisy.set([v, v, v, 255], i);
  }
  const exact = decodeGif(encode(optionsFor('ultra', 0, { lossy: 'off' }), [noisy]));
  const lossyBytes = encode(optionsFor('ultra', 0, { lossy: 'strong' }), [noisy]);
  const lossy = decodeGif(lossyBytes);

  const exactCanvas = exact.frames[0]?.canvas as Uint8Array;
  const lossyCanvas = lossy.frames[0]?.canvas as Uint8Array;
  const tolerance = resolveEncoding('ultra', { lossy: 'strong' }).lossyTolerance;
  for (let p = 0; p < exactCanvas.length; p += 3) {
    const dr = (lossyCanvas[p] as number) - (exactCanvas[p] as number);
    const dg = (lossyCanvas[p + 1] as number) - (exactCanvas[p + 1] as number);
    const db = (lossyCanvas[p + 2] as number) - (exactCanvas[p + 2] as number);
    expect(Math.sqrt(dr * dr + dg * dg + db * db)).toBeLessThanOrEqual(tolerance);
  }
  expect(lossyBytes.length).toBeLessThan(
    encode(optionsFor('ultra', 0, { lossy: 'off' }), [noisy]).length,
  );
});

test('frames larger than the output are downscaled before encoding', () => {
  const options = { ...optionsFor('high'), frameSize: { width: WIDTH * 2, height: HEIGHT * 2 } };
  const session = new GifEncodingSession(options);
  const color: Rgb = [40, 160, 220];
  session.addFrame(solidFrame(color, WIDTH * 2, HEIGHT * 2), 100);
  const gif = decodeGif(session.finish());

  expect(gif.width).toBe(WIDTH);
  expect(maxError(gif.frames[0]?.canvas as Uint8Array, solidFrame(color))).toBeLessThan(4);
});

test('palette samples are downscaled too', () => {
  const options = {
    ...optionsFor('medium'),
    frameSize: { width: WIDTH * 2, height: HEIGHT * 2 },
  };
  const session = new GifEncodingSession(options);
  const color: Rgb = [220, 40, 90];
  session.setGlobalPalette([solidFrame(color, WIDTH * 2, HEIGHT * 2)]);
  session.addFrame(solidFrame(color, WIDTH * 2, HEIGHT * 2), 100);
  expect(
    maxError(decodeGif(session.finish()).frames[0]?.canvas as Uint8Array, solidFrame(color)),
  ).toBeLessThan(4);
});
