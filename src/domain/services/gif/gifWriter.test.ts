import { expect, test } from 'vitest';

import { decodeGif } from '@/tests/gifDecoder';

import { GifWriter } from './gifWriter';

const RED_GREEN_BLUE = Uint8Array.of(255, 0, 0, 0, 255, 0, 0, 0, 255);

test('writes frames that decode to the given pixels, rectangles and delays', () => {
  const writer = new GifWriter(4, 2, 0);
  writer.writeFrame({
    rect: { left: 0, top: 0, width: 4, height: 2 },
    indices: Uint8Array.of(0, 0, 1, 1, 2, 2, 0, 0),
    palette: RED_GREEN_BLUE,
    delayMs: 120,
    transparentIndex: -1,
  });
  writer.writeFrame({
    rect: { left: 2, top: 1, width: 2, height: 1 },
    indices: Uint8Array.of(2, 1),
    delayMs: 40,
    transparentIndex: 3,
  });
  const gif = decodeGif(writer.finish());

  expect(gif.frames.map((frame) => frame.delayCs)).toEqual([12, 4]);
  expect(gif.frames[1]?.rect).toEqual({ left: 2, top: 1, width: 2, height: 1 });
  expect(gif.frames[1]?.hasLocalPalette).toBe(false);
  // Bottom-right two pixels changed from red to blue and green.
  expect(Array.from(gif.frames[1]?.canvas.subarray(18, 24) ?? [])).toEqual([0, 0, 255, 0, 255, 0]);
});

test('later frames with their own palette carry a local color table', () => {
  const writer = new GifWriter(1, 1, -1);
  writer.writeFrame({
    rect: { left: 0, top: 0, width: 1, height: 1 },
    indices: Uint8Array.of(0),
    palette: RED_GREEN_BLUE,
    delayMs: 100,
    transparentIndex: -1,
  });
  writer.writeFrame({
    rect: { left: 0, top: 0, width: 1, height: 1 },
    indices: Uint8Array.of(0),
    palette: Uint8Array.of(9, 8, 7),
    delayMs: 100,
    transparentIndex: -1,
  });
  const gif = decodeGif(writer.finish());
  expect(gif.frames[1]?.hasLocalPalette).toBe(true);
  expect(Array.from(gif.frames[1]?.canvas ?? [])).toEqual([9, 8, 7]);
});

test('extending the last frame adds to its delay', () => {
  const writer = new GifWriter(1, 1, 0);
  expect(() => writer.extendLastFrame(100)).toThrow();
  writer.writeFrame({
    rect: { left: 0, top: 0, width: 1, height: 1 },
    indices: Uint8Array.of(1),
    palette: RED_GREEN_BLUE,
    delayMs: 30,
    transparentIndex: -1,
  });
  writer.extendLastFrame(40);
  writer.extendLastFrame(30);
  expect(decodeGif(writer.finish()).frames[0]?.delayCs).toBe(10);
});

test('the first frame must provide the palette', () => {
  const writer = new GifWriter(1, 1, 0);
  expect(() =>
    writer.writeFrame({
      rect: { left: 0, top: 0, width: 1, height: 1 },
      indices: Uint8Array.of(0),
      delayMs: 10,
      transparentIndex: -1,
    }),
  ).toThrow();
});
