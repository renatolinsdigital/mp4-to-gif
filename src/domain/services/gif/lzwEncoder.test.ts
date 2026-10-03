import { describe, expect, test } from 'vitest';

import { decodeLzw } from '@/tests/gifDecoder';

import { LzwEncoder, type ByteSink, type LossyMatch } from './lzwEncoder';

function sink(): ByteSink & { bytes: () => Uint8Array } {
  const data: number[] = [];
  return {
    writeByte: (value) => data.push(value),
    writeBytes: (bytes) => data.push(...bytes),
    bytes: () => Uint8Array.from(data),
  };
}

/** Deterministic pseudo-random symbols in [0, range). */
function noise(length: number, range: number, seed = 1): Uint8Array {
  const out = new Uint8Array(length);
  let state = seed;
  for (let i = 0; i < length; i++) {
    state = (state * 1103515245 + 12345) >>> 0;
    out[i] = (state >>> 16) % range;
  }
  return out;
}

function encode(
  indices: Uint8Array,
  minCodeSize: number,
  lossy?: LossyMatch,
  encoder = new LzwEncoder(),
) {
  const out = sink();
  const written = encoder.encode(indices, minCodeSize, out, lossy);
  return { bytes: out.bytes(), written };
}

describe('lossless', () => {
  test.each([
    ['random 2-bit', noise(5000, 4), 2],
    ['random 8-bit, past the 4096-code table limit', noise(40_000, 256), 8],
    ['long runs', Uint8Array.from({ length: 30_000 }, (_, i) => (i >> 9) % 3), 2],
    ['a single pixel', Uint8Array.of(5), 3],
  ])('round-trips %s', (_, indices, minCodeSize) => {
    const { bytes, written } = encode(indices, minCodeSize);
    expect(written).toBe(indices);
    expect(decodeLzw(bytes).indices).toEqual(Array.from(indices));
  });

  test('writes an end code the decoder can read at every input length', () => {
    // Regression: when the last code filled the code width, the end code was written one
    // bit too narrow. Decoders that read up to the end code then ran out of data.
    const indices = noise(400, 4, 11);
    for (let length = 1; length <= indices.length; length++) {
      const prefix = indices.subarray(0, length);
      expect(decodeLzw(encode(prefix, 2).bytes).indices).toEqual(Array.from(prefix));
    }
  });

  test('an encoder reused across frames starts each one with a clean dictionary', () => {
    // Regression: entries left over from the previous frame produced undecodable codes.
    const encoder = new LzwEncoder();
    encode(noise(20_000, 200, 3), 8, undefined, encoder);
    const second = noise(20_000, 7, 9);
    const { bytes } = encode(second, 3, undefined, encoder);
    expect(decodeLzw(bytes).indices).toEqual(Array.from(second));
  });
});

describe('lossy', () => {
  // 16 grays, 0, 17, ... 255, plus a transparent slot at index 16.
  const palette = Uint8Array.from({ length: 17 * 3 }, (_, i) =>
    Math.min(255, Math.floor(i / 3) * 17),
  );
  const transparentIndex = 16;

  function lossyFor(
    length: number,
    tolerance: number,
    { belowGray = 0, width = length, keep = tolerance } = {},
  ): LossyMatch {
    return {
      tolerance: tolerance * tolerance,
      keepTolerance: keep * keep,
      width,
      palette,
      transparentIndex,
      below: new Uint8Array(length * 3).fill(belowGray),
      source: new Uint8Array(length * 3).fill(belowGray),
    };
  }

  const shown = (index: number, lossy: LossyMatch, pixel: number) =>
    index === transparentIndex
      ? (lossy.below[pixel * 3] as number)
      : (palette[index * 3] as number);

  test('decodes to the returned indices, each within tolerance of the original', () => {
    // A gray ramp with ±1 step of noise: the kind of detail lossy matching smooths over.
    const ramp = noise(20_000, 3, 5).map((offset, i) =>
      Math.max(0, Math.min(15, ((i >> 7) % 16) + offset - 1)),
    );
    const lossy = lossyFor(ramp.length, 30);
    const { bytes, written } = encode(ramp, 5, lossy);

    expect(decodeLzw(bytes).indices).toEqual(Array.from(written));
    for (let i = 0; i < ramp.length; i++) {
      const error = Math.abs(
        shown(written[i] as number, lossy, i) - shown(ramp[i] as number, lossy, i),
      );
      expect(error * error * 3).toBeLessThanOrEqual(lossy.tolerance);
    }
  });

  test('compresses noisy pixels smaller than lossless', () => {
    const ramp = noise(20_000, 3, 5).map((offset, i) =>
      Math.max(0, Math.min(15, ((i >> 7) % 16) + offset - 1)),
    );
    const lossless = encode(ramp, 5).bytes.length;
    const lossy = encode(ramp, 5, lossyFor(ramp.length, 30)).bytes.length;
    // Swaps must balance out along the row, which leaves fewer of them than plain greedy.
    expect(lossy).toBeLessThan(lossless * 0.9);
  });

  test('compares transparent pixels by what shows through them', () => {
    // Index 3 (gray 51) over a background of gray 51 may become transparent, and the reverse.
    const indices = Uint8Array.from({ length: 4000 }, (_, i) =>
      i % 5 === 0 ? 3 : transparentIndex,
    );
    const lossy = lossyFor(indices.length, 2, { belowGray: 51 });
    const { written } = encode(indices, 5, lossy);
    for (let i = 0; i < indices.length; i++) {
      expect(shown(written[i] as number, lossy, i)).toBe(51);
    }
    // ...but never when the background differs.
    const strict = lossyFor(indices.length, 2, { belowGray: 200 });
    const { written: kept } = encode(indices, 5, strict);
    expect(Array.from(kept)).toEqual(Array.from(indices));
  });

  test('swaps along a row balance out instead of all leaning one way', () => {
    // Regression: strings of a gray 6 followed by gray 5s, seen in earlier rows, were
    // stretched over a row of gray 6. Nearly every pixel came out one step darker: a streak.
    const width = 8;
    const lastRow = width * 64;
    const indices = new Uint8Array(lastRow + width).fill(5);
    for (let row = 0; row <= lastRow; row += width) indices[row] = 6;
    indices.fill(6, lastRow);
    const lossy = lossyFor(indices.length, 30, { width });
    const { written } = encode(indices, 5, lossy);

    let drift = 0;
    for (let i = lastRow; i < indices.length; i++) {
      drift += shown(written[i] as number, lossy, i) - shown(indices[i] as number, lossy, i);
    }
    // On average the row stays within a quarter of a palette step (17) of its true gray.
    expect(Math.abs(drift / width)).toBeLessThan(17 / 4);
  });

  describe('a pixel that should change', () => {
    // Gray 68 (index 4) wanted where gray 51 shows: one palette step, within the tolerance,
    // but leaving gray 51 in place would keep it wrong frame after frame.
    const keepOnly = (length: number) => lossyFor(length, 30, { belowGray: 51, keep: 6 });

    test('is left transparent only within the keep tolerance', () => {
      const indices = Uint8Array.from({ length: 4000 }, (_, i) =>
        i % 7 === 3 ? 4 : transparentIndex,
      );
      const { written } = encode(indices, 5, keepOnly(indices.length));
      for (let i = 3; i < indices.length; i += 7) expect(written[i]).toBe(4);
    });

    test('is not repainted with the color already on screen either', () => {
      // Regression: strings of gray 51 drew the old color back, recreating moved-away lines.
      const indices = Uint8Array.from({ length: 4000 }, (_, i) => (i % 7 === 3 ? 4 : 3));
      const { written } = encode(indices, 5, keepOnly(indices.length));
      for (let i = 3; i < indices.length; i += 7) expect(written[i]).toBe(4);
    });
  });
});
