export type QualityPreset = 'low' | 'medium' | 'high' | 'veryHigh' | 'ultra';

export type FrameRateOption = 'auto' | 10 | 15 | 20 | 24 | 30;

/** 1280 is HD (720p) and 1920 is Full HD (1080p) for 16:9 video. */
export type WidthOption = 'original' | 320 | 480 | 720 | 1280 | 1920 | 'custom';

export type LoopMode = 'infinite' | 'once';

export type Section = { mode: 'full' } | { mode: 'range'; start: number; end: number };

export type PaletteSize = 64 | 128 | 256;

/** `ordered` is a Bayer pattern; `diffusion` is Floyd–Steinberg error diffusion. */
export type DitherMode = 'off' | 'ordered' | 'diffusion';

/** `global` shares one palette across frames (smaller); `perFrame` rebuilds it when the scene's colors change. */
export type PaletteMode = 'global' | 'perFrame';

/** How much frame-to-frame flicker (noise) is ignored when dropping pixels as "unchanged". */
export type PixelSkipLevel = 'off' | 'light' | 'medium' | 'strong';

/** How far the compressor may nudge pixel colors to shrink the file (like gifsicle's `--lossy`). */
export type LossyLevel = 'off' | 'light' | 'medium' | 'strong';

/** Fine-tuning on top of the quality preset. A missing field follows the preset. */
export interface QualityTuning {
  maxColors?: PaletteSize;
  dither?: DitherMode;
  paletteMode?: PaletteMode;
  pixelSkip?: PixelSkipLevel;
  lossy?: LossyLevel;
}

/** Settings chosen by the user, applied to the current video. */
export interface ConversionSettings {
  quality: QualityPreset;
  tuning: QualityTuning;
  frameRate: FrameRateOption;
  width: WidthOption;
  customWidth: number;
  loop: LoopMode;
  section: Section;
}

/** Encoder parameters resolved from a preset plus its tuning. */
export interface EncodingParams {
  /** Maximum palette size, including the slot reserved for transparency. */
  maxColors: PaletteSize;
  /** Color precision used while building the palette. Coarser means smaller files. */
  colorFormat: 'rgb444' | 'rgb565';
  paletteMode: PaletteMode;
  dither: DitherMode;
  /**
   * Max RGB distance a pixel may flicker from the previous frame and still be treated as
   * unchanged and encoded as transparent. Higher values ignore more noise (smaller files);
   * changes that persist are redrawn regardless.
   */
  unchangedPixelThreshold: number;
  /**
   * Max RGB distance the LZW stage may move a pixel's color to extend a run of already
   * seen pixels. 0 keeps every pixel exact.
   */
  lossyTolerance: number;
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

/** Fully resolved parameters for one conversion, derived from settings + video metadata. */
export interface ConversionPlan {
  output: Dimensions;
  /** True when the requested width was larger than the source and got capped. */
  widthCapped: boolean;
  fps: number;
  start: number;
  end: number;
  frameTimes: number[];
  /** Per-frame delay in milliseconds, always a multiple of 10 (GIF stores centiseconds). */
  frameDelaysMs: number[];
  loop: LoopMode;
  quality: QualityPreset;
  encoding: EncodingParams;
}
