import type {
  DitherMode,
  EncodingParams,
  LossyLevel,
  PaletteMode,
  PaletteSize,
  PixelSkipLevel,
  QualityPreset,
  QualityTuning,
} from '@/domain/types/conversion';

export interface QualityPresetConfig {
  label: string;
  /** Short line shown under the preset's button. */
  hint: string;
  summary: string;
  maxColors: PaletteSize;
  colorFormat: EncodingParams['colorFormat'];
  paletteMode: PaletteMode;
  dither: DitherMode;
  pixelSkip: PixelSkipLevel;
  lossy: LossyLevel;
  /** Frame rate used when the frame rate setting is "Automatic". */
  autoFrameRate: number;
  /**
   * Rough bytes per output pixel per frame, used only for the size estimate. Measured on
   * handheld camera footage, about the costliest content for GIF; screen recordings and
   * animation usually come out several times smaller.
   */
  estimatedBytesPerPixel: number;
}

export const QUALITY_PRESET_ORDER: readonly QualityPreset[] = [
  'low',
  'medium',
  'high',
  'veryHigh',
  'ultra',
];

export const QUALITY_PRESETS: Record<QualityPreset, QualityPresetConfig> = {
  low: {
    label: 'Low',
    hint: '64 colors',
    summary: 'Smallest file size. Fewer colors and a shared palette.',
    maxColors: 64,
    colorFormat: 'rgb444',
    paletteMode: 'global',
    dither: 'ordered',
    pixelSkip: 'strong',
    lossy: 'strong',
    autoFrameRate: 10,
    estimatedBytesPerPixel: 0.09,
  },
  medium: {
    label: 'Medium',
    hint: '128 colors',
    summary: 'Balanced quality and size. Good default for most clips.',
    maxColors: 128,
    colorFormat: 'rgb565',
    paletteMode: 'global',
    dither: 'ordered',
    pixelSkip: 'medium',
    lossy: 'medium',
    autoFrameRate: 15,
    estimatedBytesPerPixel: 0.15,
  },
  high: {
    label: 'High',
    hint: '256 colors',
    summary: 'Better image quality. The 256-color palette adapts when the scene changes.',
    maxColors: 256,
    colorFormat: 'rgb565',
    paletteMode: 'perFrame',
    dither: 'ordered',
    pixelSkip: 'light',
    lossy: 'light',
    autoFrameRate: 20,
    estimatedBytesPerPixel: 0.18,
  },
  veryHigh: {
    label: 'Very High',
    hint: 'no pixel skip',
    summary: 'Redraws every pixel that changes, at 24 FPS, for crisp motion and fine detail.',
    maxColors: 256,
    colorFormat: 'rgb565',
    paletteMode: 'perFrame',
    dither: 'ordered',
    pixelSkip: 'off',
    lossy: 'medium',
    autoFrameRate: 24,
    estimatedBytesPerPixel: 0.2,
  },
  ultra: {
    label: 'Ultra',
    hint: 'new',
    summary:
      'Error-diffusion dithering, no pixel skipping, 30 FPS. Made for HD and Full HD. Largest files.',
    maxColors: 256,
    colorFormat: 'rgb565',
    paletteMode: 'perFrame',
    dither: 'diffusion',
    pixelSkip: 'off',
    lossy: 'light',
    autoFrameRate: 30,
    estimatedBytesPerPixel: 0.25,
  },
};

/**
 * How far, in RGB distance, a pixel may flicker from frame to frame (video noise) and still
 * count as unchanged. Changes that persist are redrawn whatever the level, so moving content
 * never leaves ghosts behind. `off` still drops exact repeats, which is lossless.
 */
export const PIXEL_SKIP_THRESHOLDS: Record<PixelSkipLevel, number> = {
  off: 0,
  light: 4,
  medium: 12,
  strong: 24,
};

/**
 * Largest RGB distance the compressor may move a pixel. Neighboring pixels must balance out
 * around the true color, so the loss shows as fine grain rather than streaks: light is hard
 * to see in motion, strong is visible grain.
 */
export const LOSSY_TOLERANCES: Record<LossyLevel, number> = {
  off: 0,
  light: 8,
  medium: 14,
  strong: 24,
};

export function resolveEncoding(
  quality: QualityPreset,
  tuning: QualityTuning = {},
): EncodingParams {
  const preset = QUALITY_PRESETS[quality];
  return {
    maxColors: tuning.maxColors ?? preset.maxColors,
    colorFormat: preset.colorFormat,
    paletteMode: tuning.paletteMode ?? preset.paletteMode,
    dither: tuning.dither ?? preset.dither,
    unchangedPixelThreshold: PIXEL_SKIP_THRESHOLDS[tuning.pixelSkip ?? preset.pixelSkip],
    lossyTolerance: LOSSY_TOLERANCES[tuning.lossy ?? preset.lossy],
  };
}

/** True when the tuning actually changes something compared to the preset. */
export function isTuned(quality: QualityPreset, tuning: QualityTuning): boolean {
  const preset = QUALITY_PRESETS[quality];
  return (
    (tuning.maxColors !== undefined && tuning.maxColors !== preset.maxColors) ||
    (tuning.dither !== undefined && tuning.dither !== preset.dither) ||
    (tuning.paletteMode !== undefined && tuning.paletteMode !== preset.paletteMode) ||
    (tuning.pixelSkip !== undefined && tuning.pixelSkip !== preset.pixelSkip) ||
    (tuning.lossy !== undefined && tuning.lossy !== preset.lossy)
  );
}

const COLOR_SIZE_FACTOR: Record<PaletteSize, number> = { 64: 0.6, 128: 0.8, 256: 1 };
const DITHER_SIZE_FACTOR: Record<DitherMode, number> = { off: 1, ordered: 1.15, diffusion: 1.3 };
const PALETTE_SIZE_FACTOR: Record<PaletteMode, number> = { global: 0.85, perFrame: 1 };

/** Measured: lossy matching saves the most on dithered and noisy footage, little on flat color. */
const lossySizeFactor = (tolerance: number) => 1 / (1 + tolerance / 40);

/** Relative file size of a parameter set. Only meaningful as a ratio between two sets. */
export function encodingSizeFactor(
  encoding: Pick<EncodingParams, 'maxColors' | 'dither' | 'paletteMode' | 'lossyTolerance'>,
): number {
  return (
    COLOR_SIZE_FACTOR[encoding.maxColors] *
    DITHER_SIZE_FACTOR[encoding.dither] *
    PALETTE_SIZE_FACTOR[encoding.paletteMode] *
    lossySizeFactor(encoding.lossyTolerance)
  );
}
