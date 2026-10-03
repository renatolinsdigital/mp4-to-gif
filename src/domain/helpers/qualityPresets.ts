import type {
  ConversionSettings,
  DitherMode,
  EncodingParams,
  FrameRateOption,
  LossyLevel,
  PaletteMode,
  PaletteSize,
  PixelSkipLevel,
  QualityPreset,
  QualityTuning,
  WidthOption,
} from '@/domain/types/conversion';

export interface QualityPresetConfig {
  label: string;
  /** Who the preset is for and what it trades off, in plain words. */
  summary: string;
  /** Output width the preset selects. */
  width: Extract<WidthOption, number>;
  /** Frame rate the preset selects, and what "Auto" resolves to. */
  frameRate: Exclude<FrameRateOption, 'auto' | 'custom'>;
  maxColors: PaletteSize;
  colorFormat: EncodingParams['colorFormat'];
  paletteMode: PaletteMode;
  dither: DitherMode;
  pixelSkip: PixelSkipLevel;
  lossy: LossyLevel;
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
    label: 'Compact',
    summary:
      'Smallest files, for chat apps, email, and quick previews. Uses 64 colors, so gradients look grainy.',
    width: 480,
    frameRate: 10,
    maxColors: 64,
    colorFormat: 'rgb444',
    paletteMode: 'global',
    dither: 'ordered',
    pixelSkip: 'strong',
    lossy: 'strong',
  },
  medium: {
    label: 'Standard',
    summary:
      'The default. A clear picture at a small size, good for most clips, docs, and web pages.',
    width: 720,
    frameRate: 10,
    maxColors: 128,
    colorFormat: 'rgb565',
    paletteMode: 'global',
    dither: 'ordered',
    pixelSkip: 'medium',
    lossy: 'medium',
  },
  high: {
    label: 'Smooth',
    summary:
      'Twice the frames of Standard and the full 256 colors. Made for screen recordings, UI demos, and gameplay.',
    width: 720,
    frameRate: 20,
    maxColors: 256,
    colorFormat: 'rgb565',
    paletteMode: 'perFrame',
    dither: 'ordered',
    pixelSkip: 'light',
    lossy: 'light',
  },
  veryHigh: {
    label: 'HD',
    summary:
      'Sharp detail at HD size. Every pixel that changes is redrawn, so fast motion stays crisp. Large files.',
    width: 1280,
    frameRate: 24,
    maxColors: 256,
    colorFormat: 'rgb565',
    paletteMode: 'perFrame',
    dither: 'ordered',
    pixelSkip: 'off',
    lossy: 'medium',
  },
  ultra: {
    label: 'Full HD',
    summary:
      'The best a GIF can look, for 1080p footage, with the smoothest gradients and motion. Largest files, so keep clips short.',
    width: 1920,
    frameRate: 30,
    maxColors: 256,
    colorFormat: 'rgb565',
    paletteMode: 'perFrame',
    dither: 'diffusion',
    pixelSkip: 'off',
    lossy: 'light',
  },
};

/** "720 px · 10 FPS": what a preset sets, shown under its name. */
export function presetHint(quality: QualityPreset): string {
  const { width, frameRate } = QUALITY_PRESETS[quality];
  return `${width} px · ${frameRate} FPS`;
}

/** Picking a preset sets its size and frame rate and clears earlier fine-tuning. */
export function applyPreset(
  settings: ConversionSettings,
  quality: QualityPreset,
): ConversionSettings {
  const { width, frameRate } = QUALITY_PRESETS[quality];
  return { ...settings, quality, width, frameRate, tuning: {} };
}

/** True once the size, frame rate, or fine-tuning no longer match the chosen preset. */
export function isPresetAdjusted(
  settings: Pick<
    ConversionSettings,
    'quality' | 'tuning' | 'width' | 'frameRate' | 'customFrameRate'
  >,
): boolean {
  const preset = QUALITY_PRESETS[settings.quality];
  const frameRate = settings.frameRate === 'custom' ? settings.customFrameRate : settings.frameRate;
  return (
    settings.width !== preset.width ||
    (frameRate !== 'auto' && frameRate !== preset.frameRate) ||
    isTuned(settings.quality, settings.tuning)
  );
}

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
