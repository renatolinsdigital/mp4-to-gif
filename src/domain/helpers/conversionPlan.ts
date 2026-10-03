import {
  QUALITY_PRESETS,
  encodingSizeFactor,
  resolveEncoding,
} from '@/domain/helpers/qualityPresets';
import type {
  ConversionPlan,
  ConversionSettings,
  Dimensions,
  VideoMetadata,
} from '@/domain/types/conversion';

export const MIN_SECTION_LENGTH = 0.1;

// Seeking exactly to `duration` returns no frame in some browsers, so stay just inside it.
const END_EPSILON = 0.001;

export function resolveFrameRate(
  settings: Pick<ConversionSettings, 'frameRate' | 'quality'>,
): number {
  return settings.frameRate === 'auto'
    ? QUALITY_PRESETS[settings.quality].frameRate
    : settings.frameRate;
}

export function resolveTargetWidth(
  settings: Pick<ConversionSettings, 'width' | 'customWidth'>,
  sourceWidth: number,
): number {
  if (settings.width === 'original') return sourceWidth;
  if (settings.width === 'custom') return settings.customWidth;
  return settings.width;
}

/** Output size keeps the source aspect ratio and never upscales. */
export function resolveOutputDimensions(
  settings: Pick<ConversionSettings, 'width' | 'customWidth'>,
  source: Dimensions,
): { dimensions: Dimensions; capped: boolean } {
  const requested = Math.round(resolveTargetWidth(settings, source.width));
  const capped = requested > source.width;
  const width = Math.max(1, Math.min(requested, source.width));
  const height = Math.max(1, Math.round((source.height * width) / source.width));
  return { dimensions: { width, height }, capped };
}

/** Clamps the selected section to the video's duration. */
export function resolveSection(
  section: ConversionSettings['section'],
  duration: number,
): { start: number; end: number } {
  if (section.mode === 'full') return { start: 0, end: duration };

  const start = Math.min(Math.max(0, section.start), Math.max(0, duration - MIN_SECTION_LENGTH));
  const end = Math.min(duration, Math.max(section.end, start + MIN_SECTION_LENGTH));
  return { start, end };
}

/**
 * Builds frame timestamps and delays. Delays are rounded per frame against the cumulative
 * timeline, so a 30 FPS GIF alternates 30/30/40 ms instead of drifting from 33.3 ms rounding.
 */
export function buildFrameTimeline(
  start: number,
  end: number,
  fps: number,
): { times: number[]; delaysMs: number[] } {
  const length = Math.max(0, end - start);
  const frameCount = Math.max(1, Math.ceil(length * fps - 1e-9));
  const lastTime = Math.max(start, end - END_EPSILON);
  const times: number[] = [];
  const delaysMs: number[] = [];

  for (let i = 0; i < frameCount; i++) {
    times.push(Math.min(start + i / fps, lastTime));
    const startCs = Math.round((i * 100) / fps);
    const endCs = Math.round(((i + 1) * 100) / fps);
    delaysMs.push(Math.max(1, endCs - startCs) * 10);
  }
  return { times, delaysMs };
}

export function buildConversionPlan(
  settings: ConversionSettings,
  metadata: VideoMetadata,
): ConversionPlan {
  const fps = resolveFrameRate(settings);
  const { dimensions, capped } = resolveOutputDimensions(settings, metadata);
  const { start, end } = resolveSection(settings.section, metadata.duration);
  const { times, delaysMs } = buildFrameTimeline(start, end, fps);

  return {
    output: dimensions,
    widthCapped: capped,
    fps,
    start,
    end,
    frameTimes: times,
    frameDelaysMs: delaysMs,
    loop: settings.loop,
    quality: settings.quality,
    encoding: resolveEncoding(settings.quality, settings.tuning),
  };
}

/**
 * Upper bound on output pixels across all frames. Past this, the encoded GIF (held in
 * memory until download) risks exhausting the tab's memory, so conversion is refused up
 * front with an actionable message rather than crashing the tab halfway through.
 */
export const MAX_OUTPUT_PIXEL_FRAMES = 1_200_000_000;

export function exceedsMemoryBudget(plan: ConversionPlan): boolean {
  return plan.output.width * plan.output.height * plan.frameTimes.length > MAX_OUTPUT_PIXEL_FRAMES;
}

/** Longest section, in whole seconds, that fits the memory budget at this size and frame rate. */
export function maxSecondsWithinBudget(output: Dimensions, fps: number): number {
  return Math.floor(MAX_OUTPUT_PIXEL_FRAMES / (output.width * output.height * fps));
}

/** Evenly spaced subset of frame times, used to build a shared palette. */
export function pickSampleTimes(times: number[], count: number): number[] {
  if (times.length <= count) return [...times];
  const step = (times.length - 1) / (count - 1);
  return Array.from({ length: count }, (_, i) => times[Math.round(i * step)] as number);
}

/** Rough output size. GIF size depends heavily on content, so this is only a guide. */
export function estimateGifSize(plan: ConversionPlan): number {
  const { width, height } = plan.output;
  const preset = QUALITY_PRESETS[plan.quality];
  // Tuning scales the preset's rate by how much bigger or smaller its settings make files.
  const bytesPerPixel =
    (preset.estimatedBytesPerPixel * encodingSizeFactor(plan.encoding)) /
    encodingSizeFactor(resolveEncoding(plan.quality));
  return Math.round(width * height * plan.frameTimes.length * bytesPerPixel);
}
