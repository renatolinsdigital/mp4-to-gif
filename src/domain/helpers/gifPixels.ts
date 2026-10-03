import type { DitherMode } from '@/domain/types/conversion';

export type Palette = number[][];

type PixelData = Uint8Array | Uint8ClampedArray;

const clampByte = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : Math.round(value));

/**
 * A palette flattened for fast lookups, with a nearest-color cache keyed by RGB565. Build one
 * per palette and reuse it for every frame that shares the palette, so the cache stays warm.
 */
export class PaletteMatcher {
  /** RGB triples, one per palette entry. */
  readonly colors: Uint8Array;
  readonly size: number;
  private readonly cache = new Int16Array(65536).fill(-1);

  constructor(readonly palette: Palette) {
    this.size = palette.length;
    this.colors = new Uint8Array(palette.length * 3);
    palette.forEach((color, i) => this.colors.set(color.slice(0, 3), i * 3));
  }

  nearest(r: number, g: number, b: number): number {
    const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    let index = this.cache[key] as number;
    if (index < 0) {
      index = this.scan(r, g, b);
      this.cache[key] = index;
    }
    return index;
  }

  private scan(r: number, g: number, b: number): number {
    const { colors } = this;
    let best = 0;
    let bestDistance = Infinity;
    for (let i = 0; i < colors.length; i += 3) {
      const dr = r - (colors[i] as number);
      const dg = g - (colors[i + 1] as number);
      const db = b - (colors[i + 2] as number);
      const distance = dr * dr + dg * dg + db * db;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i / 3;
        if (distance === 0) break;
      }
    }
    return best;
  }
}

/**
 * Average squared RGB error of mapping a spread of the frame's pixels to the palette. Used to
 * notice when the scene's colors drift away from the current palette.
 */
export function paletteError(rgba: PixelData, matcher: PaletteMatcher, maxSamples = 8192): number {
  const pixels = rgba.length / 4;
  const stride = Math.max(1, Math.floor(pixels / maxSamples));
  const { colors } = matcher;
  let total = 0;
  let count = 0;
  for (let pixel = 0; pixel < pixels; pixel += stride) {
    const s = pixel * 4;
    const r = rgba[s] as number;
    const g = rgba[s + 1] as number;
    const b = rgba[s + 2] as number;
    const c = matcher.nearest(r, g, b) * 3;
    const dr = r - (colors[c] as number);
    const dg = g - (colors[c + 1] as number);
    const db = b - (colors[c + 2] as number);
    total += dr * dr + dg * dg + db * db;
    count++;
  }
  return count === 0 ? 0 : total / count;
}

// 8×8 Bayer threshold matrix, values 0–63.
const BAYER_8X8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28,
  52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7,
  39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
];

/** Largest Bayer offset spread, in RGB units. */
const ORDERED_DITHER_STRENGTH = 24;
/**
 * The Bayer spread grows with how far a pixel is from its nearest palette color, so colors
 * the palette already matches stay clean and only banded gradients get the pattern.
 */
const ORDERED_DITHER_GAIN = 2;
/**
 * Share of the quantization error passed on to neighbors. Slightly under 1 keeps flat areas
 * from filling with noise while still breaking up banding.
 */
const DIFFUSION_STRENGTH = 0.875;

/**
 * Largest RGB distance a pixel may stay off from its source for good: hard to see, even as
 * a line. Skipping caps lasting changes here whatever the skip level, since noise flickers
 * around a value and averages out, but a real change, like a faint line moving away,
 * persists. Skipping those is what used to leave ghost lines on screen. The encoder's lossy
 * stage leaves old pixels in place only within this too.
 */
export const LASTING_ERROR_LIMIT = 6;

/** What the viewer currently sees, carried from one frame to the next. */
export interface ScreenState {
  /** RGB per pixel of the color on screen. */
  displayed: Uint8Array;
  /** Source RGB per pixel at the moment it was last drawn. */
  reference: Uint8Array;
  /** Source RGB per pixel averaged over recent frames, so noise evens out. */
  average: Uint8Array;
}

export function createScreenState(width: number, height: number): ScreenState {
  return {
    displayed: new Uint8Array(width * height * 3),
    reference: new Uint8Array(width * height * 3),
    average: new Uint8Array(width * height * 3),
  };
}

export interface FramePixelsOptions {
  rgba: PixelData;
  width: number;
  height: number;
  matcher: PaletteMatcher;
  dither: DitherMode;
  screen: ScreenState;
  /**
   * Max RGB distance between a source pixel and the source it had when last drawn for the
   * pixel to be left as is. 0 still skips exact repeats.
   */
  threshold: number;
  transparentIndex: number;
  isFirstFrame: boolean;
}

/**
 * Maps a frame to palette indices, marking pixels that don't need redrawing with the
 * transparent index (the previous frame shows through). Long transparent runs compress very
 * well, which is the main size win for video GIFs.
 *
 * "Unchanged" is decided on the source pixels, before dithering, so still areas stay
 * transparent even when dithering or a palette change would draw them slightly differently.
 * Pixels that do change but land on the color already on screen are skipped too.
 * Updates `screen.reference` and `screen.average` in place; `screen.displayed` is left to
 * `commitFramePixels`, since the encoder may still adjust the pixels it writes.
 */
export function mapFramePixels(options: FramePixelsOptions): Uint8Array {
  const { rgba, width, height, matcher, dither, screen, transparentIndex, isFirstFrame } = options;
  const { displayed, reference, average } = screen;
  const { colors } = matcher;
  const thresholdSquared = options.threshold * options.threshold;
  const persistentSquared = Math.min(options.threshold, LASTING_ERROR_LIMIT) ** 2;
  const indices = new Uint8Array(width * height);

  const diffuse = dither === 'diffusion';
  const ordered = dither === 'ordered';
  const rowLength = (width + 2) * 3;
  let currentErrors = new Float32Array(diffuse ? rowLength : 0);
  let nextErrors = new Float32Array(diffuse ? rowLength : 0);

  // Floyd–Steinberg weights, applied to one channel's error at error-row offset `i`.
  const spreadChannel = (i: number, error: number) => {
    const scaled = error * DIFFUSION_STRENGTH;
    currentErrors[i + 3] = (currentErrors[i + 3] as number) + (scaled * 7) / 16;
    nextErrors[i - 3] = (nextErrors[i - 3] as number) + (scaled * 3) / 16;
    nextErrors[i] = (nextErrors[i] as number) + (scaled * 5) / 16;
    nextErrors[i + 3] = (nextErrors[i + 3] as number) + scaled / 16;
  };
  const spreadError = (e: number, er: number, eg: number, eb: number) => {
    spreadChannel(e, er);
    spreadChannel(e + 1, eg);
    spreadChannel(e + 2, eb);
  };

  for (let y = 0; y < height; y++) {
    const bayerRow = (y & 7) * 8;
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      const s = pixel * 4;
      const d = pixel * 3;
      const e = (x + 1) * 3;
      const sr = rgba[s] as number;
      const sg = rgba[s + 1] as number;
      const sb = rgba[s + 2] as number;
      // Halfway between the running average and this frame: noise halves, real changes
      // show up within a frame or two.
      const ar = isFirstFrame ? sr : ((average[d] as number) + sr + 1) >> 1;
      const ag = isFirstFrame ? sg : ((average[d + 1] as number) + sg + 1) >> 1;
      const ab = isFirstFrame ? sb : ((average[d + 2] as number) + sb + 1) >> 1;
      average[d] = ar;
      average[d + 1] = ag;
      average[d + 2] = ab;

      let r = sr;
      let g = sg;
      let b = sb;
      if (diffuse) {
        r = clampByte(sr + (currentErrors[e] as number));
        g = clampByte(sg + (currentErrors[e + 1] as number));
        b = clampByte(sb + (currentErrors[e + 2] as number));
      }

      if (!isFirstFrame) {
        const rr = reference[d] as number;
        const rg = reference[d + 1] as number;
        const rb = reference[d + 2] as number;
        const dr = sr - rr;
        const dg = sg - rg;
        const db = sb - rb;
        const pr = ar - rr;
        const pg = ag - rg;
        const pb = ab - rb;
        if (
          dr * dr + dg * dg + db * db <= thresholdSquared &&
          pr * pr + pg * pg + pb * pb <= persistentSquared
        ) {
          indices[pixel] = transparentIndex;
          // The old color stays on screen, so its error is what neighbors should balance.
          if (diffuse) {
            spreadError(
              e,
              r - (displayed[d] as number),
              g - (displayed[d + 1] as number),
              b - (displayed[d + 2] as number),
            );
          }
          continue;
        }
      }

      if (ordered) {
        const c = matcher.nearest(r, g, b) * 3;
        const dr = r - (colors[c] as number);
        const dg = g - (colors[c + 1] as number);
        const db = b - (colors[c + 2] as number);
        const spread = Math.min(
          ORDERED_DITHER_STRENGTH,
          ORDERED_DITHER_GAIN * Math.sqrt(dr * dr + dg * dg + db * db),
        );
        const offset = ((BAYER_8X8[bayerRow + (x & 7)] as number) / 64 - 0.5) * spread;
        r = clampByte(r + offset);
        g = clampByte(g + offset);
        b = clampByte(b + offset);
      }

      const index = matcher.nearest(r, g, b);
      const c = index * 3;
      const cr = colors[c] as number;
      const cg = colors[c + 1] as number;
      const cb = colors[c + 2] as number;
      if (diffuse) spreadError(e, r - cr, g - cg, b - cb);

      reference[d] = sr;
      reference[d + 1] = sg;
      reference[d + 2] = sb;

      if (
        !isFirstFrame &&
        cr === displayed[d] &&
        cg === displayed[d + 1] &&
        cb === displayed[d + 2]
      ) {
        indices[pixel] = transparentIndex;
        continue;
      }
      indices[pixel] = index;
    }
    if (diffuse) {
      [currentErrors, nextErrors] = [nextErrors, currentErrors];
      nextErrors.fill(0);
    }
  }
  return indices;
}

/** Part of the canvas a frame covers, in pixels. */
export interface FrameRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Smallest rectangle holding every non-transparent pixel, or null when nothing changed. */
export function changedRect(
  indices: Uint8Array,
  width: number,
  height: number,
  transparentIndex: number,
): FrameRect | null {
  let top = -1;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let first = -1;
    for (let x = 0; x < width; x++) {
      if (indices[row + x] !== transparentIndex) {
        first = x;
        break;
      }
    }
    if (first < 0) continue;
    let last = width - 1;
    while (indices[row + last] === transparentIndex) last--;
    if (top < 0) top = y;
    bottom = y;
    if (first < left) left = first;
    if (last > right) right = last;
  }
  if (top < 0) return null;
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** Copies `rect` out of a full-frame buffer with `channels` bytes per pixel. */
export function cropPixels(
  data: Uint8Array,
  width: number,
  rect: FrameRect,
  channels: number,
): Uint8Array {
  if (rect.left === 0 && rect.width === width && data.length === rect.height * width * channels) {
    return data;
  }
  const rowBytes = rect.width * channels;
  const cropped = new Uint8Array(rowBytes * rect.height);
  for (let y = 0; y < rect.height; y++) {
    const start = ((rect.top + y) * width + rect.left) * channels;
    cropped.set(data.subarray(start, start + rowBytes), y * rowBytes);
  }
  return cropped;
}

export interface CommitPixelsOptions {
  screen: ScreenState;
  width: number;
  rect: FrameRect;
  /** Indices as written for `rect`. */
  indices: Uint8Array;
  matcher: PaletteMatcher;
  transparentIndex: number;
}

/** Records what the viewer sees after a frame: drawn pixels take their palette color. */
export function commitFramePixels(options: CommitPixelsOptions): void {
  const { screen, width, rect, indices, matcher, transparentIndex } = options;
  const { displayed } = screen;
  const { colors } = matcher;
  for (let y = 0; y < rect.height; y++) {
    for (let x = 0; x < rect.width; x++) {
      const index = indices[y * rect.width + x] as number;
      if (index === transparentIndex) continue;
      const d = ((rect.top + y) * width + rect.left + x) * 3;
      const c = index * 3;
      displayed[d] = colors[c] as number;
      displayed[d + 1] = colors[c + 1] as number;
      displayed[d + 2] = colors[c + 2] as number;
    }
  }
}

/**
 * Concatenates sample frames for palette building, skipping pixels so the combined
 * buffer stays under `maxPixels`. Quantizing a whole 1080p clip would be slow and
 * unnecessary: a spread of pixels represents the colors just as well.
 */
export function combinePaletteSamples(samples: PixelData[], maxPixels = 500_000): Uint8Array {
  const totalPixels = samples.reduce((sum, sample) => sum + sample.length / 4, 0);
  const stride = Math.max(1, Math.ceil(totalPixels / maxPixels));
  const combined = new Uint8Array(Math.ceil(totalPixels / stride) * 4 + samples.length * 4);

  let offset = 0;
  for (const sample of samples) {
    for (let pixel = 0; pixel < sample.length / 4; pixel += stride) {
      combined.set(sample.subarray(pixel * 4, pixel * 4 + 4), offset);
      offset += 4;
    }
  }
  return combined.subarray(0, offset);
}
