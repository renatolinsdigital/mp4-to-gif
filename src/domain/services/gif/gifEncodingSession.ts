import { quantize } from 'gifenc';

import {
  LASTING_ERROR_LIMIT,
  PaletteMatcher,
  changedRect,
  combinePaletteSamples,
  commitFramePixels,
  createScreenState,
  cropPixels,
  mapFramePixels,
  paletteError,
  type FrameRect,
  type ScreenState,
} from '@/domain/helpers/gifPixels';
import { Resampler } from '@/domain/helpers/resample';
import { GifWriter } from '@/domain/services/gif/gifWriter';
import type { Dimensions, EncodingParams } from '@/domain/types/conversion';

export type GifEncodingOptions = EncodingParams & {
  width: number;
  height: number;
  /** gifenc convention: 0 loops forever, -1 plays once. */
  repeat: number;
  /** Size of the frames passed in, when larger than the output. They are downscaled with Lanczos. */
  frameSize?: Dimensions;
};

// An adaptive palette is rebuilt once the frame's average squared color error grows past
// this multiple of the error it had when built, plus a margin so near-perfect palettes on
// flat scenes don't rebuild over noise.
const PALETTE_REBUILD_RATIO = 1.5;
const PALETTE_REBUILD_MARGIN = 12;

/** RGB triples of the palette plus a black slot for the transparent index. */
function tableColors(matcher: PaletteMatcher): Uint8Array {
  const table = new Uint8Array(matcher.colors.length + 3);
  table.set(matcher.colors);
  return table;
}

/** RGB of `rect` from an RGBA frame. */
function sourceRgb(rgba: Uint8ClampedArray, width: number, rect: FrameRect): Uint8Array {
  const rgb = new Uint8Array(rect.width * rect.height * 3);
  let out = 0;
  for (let y = 0; y < rect.height; y++) {
    let s = ((rect.top + y) * width + rect.left) * 4;
    for (let x = 0; x < rect.width; x++, s += 4) {
      rgb[out++] = rgba[s] as number;
      rgb[out++] = rgba[s + 1] as number;
      rgb[out++] = rgba[s + 2] as number;
    }
  }
  return rgb;
}

/**
 * Streams frames into a GIF. Runs inside the encoder worker, but has no worker-specific
 * code so it can be unit tested directly.
 */
export class GifEncodingSession {
  private readonly writer: GifWriter;
  private readonly screen: ScreenState;
  private readonly fullFrame: FrameRect;
  private readonly resampler: Resampler | null;
  private palette: PaletteMatcher | null = null;
  /** Error of the current adaptive palette on the frame it was built from. */
  private paletteBaseError = 0;
  private globalTablePalette: PaletteMatcher | null = null;
  private framesAdded = 0;

  constructor(private readonly options: GifEncodingOptions) {
    this.writer = new GifWriter(options.width, options.height, options.repeat);
    this.screen = createScreenState(options.width, options.height);
    this.fullFrame = { left: 0, top: 0, width: options.width, height: options.height };
    const { frameSize } = options;
    this.resampler =
      frameSize && (frameSize.width !== options.width || frameSize.height !== options.height)
        ? new Resampler(frameSize, { width: options.width, height: options.height })
        : null;
  }

  /** Frames stored in the GIF. Frames identical to the one before are merged into it. */
  get framesWritten(): number {
    return this.writer.frameCount;
  }

  /** Builds the shared palette used by `global` palette presets. */
  setGlobalPalette(samples: Uint8ClampedArray[]): void {
    if (samples.length === 0) return;
    this.palette = this.buildPalette(
      combinePaletteSamples(samples.map((sample) => this.toOutputSize(sample))),
    );
  }

  addFrame(frame: Uint8ClampedArray, delayMs: number): void {
    const { width, height, dither, unchangedPixelThreshold, lossyTolerance } = this.options;
    const rgba = this.toOutputSize(frame);
    const isFirstFrame = this.framesAdded === 0;
    this.framesAdded++;
    const matcher = this.paletteFor(rgba);
    const transparentIndex = matcher.size;

    const indices = mapFramePixels({
      rgba,
      width,
      height,
      matcher,
      dither,
      screen: this.screen,
      threshold: unchangedPixelThreshold,
      transparentIndex,
      isFirstFrame,
    });

    // Only the area that changed is stored. When nothing changed, the previous frame
    // simply stays up longer.
    const rect = isFirstFrame
      ? this.fullFrame
      : changedRect(indices, width, height, transparentIndex);
    if (!rect) {
      this.writer.extendLastFrame(delayMs);
      return;
    }

    // The first frame's palette becomes the global color table. Later frames only carry a
    // local table when their palette differs from it, saving 768 bytes per frame.
    if (isFirstFrame) this.globalTablePalette = matcher;
    const includePalette = isFirstFrame || matcher !== this.globalTablePalette;
    const written = this.writer.writeFrame({
      rect,
      indices: cropPixels(indices, width, rect, 1),
      palette: includePalette ? tableColors(matcher) : undefined,
      delayMs,
      transparentIndex: isFirstFrame ? -1 : transparentIndex,
      lossy:
        lossyTolerance > 0
          ? {
              tolerance: lossyTolerance * lossyTolerance,
              keepTolerance: Math.min(lossyTolerance, LASTING_ERROR_LIMIT) ** 2,
              below: cropPixels(this.screen.displayed, width, rect, 3),
              source: sourceRgb(rgba, width, rect),
            }
          : undefined,
    });
    commitFramePixels({
      screen: this.screen,
      width,
      rect,
      indices: written,
      matcher,
      transparentIndex,
    });
  }

  finish(): Uint8Array<ArrayBuffer> {
    return this.writer.finish();
  }

  private toOutputSize(frame: Uint8ClampedArray): Uint8ClampedArray {
    return this.resampler ? this.resampler.resize(frame) : frame;
  }

  /**
   * `global` keeps one palette for the whole clip. `perFrame` adapts: it keeps the current
   * palette while it still fits the frame and rebuilds it when the colors change (a cut, a
   * fade). Reusing it keeps colors stable between frames, which avoids flicker, lets still
   * areas be skipped, and avoids quantizing every frame, the slowest step.
   */
  private paletteFor(rgba: Uint8ClampedArray): PaletteMatcher {
    if (this.palette && this.options.paletteMode === 'global') return this.palette;
    if (this.palette) {
      const error = paletteError(rgba, this.palette);
      if (error <= this.paletteBaseError * PALETTE_REBUILD_RATIO + PALETTE_REBUILD_MARGIN) {
        return this.palette;
      }
    }
    this.palette = this.buildPalette(rgba);
    this.paletteBaseError = paletteError(rgba, this.palette);
    return this.palette;
  }

  private buildPalette(rgba: Uint8Array | Uint8ClampedArray): PaletteMatcher {
    // One slot is reserved for the transparent "unchanged pixel" color.
    return new PaletteMatcher(
      quantize(rgba, this.options.maxColors - 1, { format: this.options.colorFormat }),
    );
  }
}
