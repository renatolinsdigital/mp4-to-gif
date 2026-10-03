import { describe, expect, test } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';

import {
  MIN_SECTION_LENGTH,
  buildConversionPlan,
  buildFrameTimeline,
  exceedsMemoryBudget,
  gifDurationSeconds,
  maxSecondsWithinBudget,
  pickSampleTimes,
  resolveFrameRate,
  resolveOutputDimensions,
  resolveSection,
} from './conversionPlan';

const HD = { width: 1920, height: 1080 };

describe('resolveOutputDimensions', () => {
  test('keeps the aspect ratio', () => {
    expect(resolveOutputDimensions({ width: 480, customWidth: 0 }, HD).dimensions).toEqual({
      width: 480,
      height: 270,
    });
  });

  test('uses the source width for "original"', () => {
    expect(resolveOutputDimensions({ width: 'original', customWidth: 0 }, HD).dimensions).toEqual(
      HD,
    );
  });

  test('uses the custom width', () => {
    expect(resolveOutputDimensions({ width: 'custom', customWidth: 640 }, HD).dimensions).toEqual({
      width: 640,
      height: 360,
    });
  });

  test('never upscales and reports the cap', () => {
    const result = resolveOutputDimensions(
      { width: 720, customWidth: 0 },
      { width: 320, height: 240 },
    );
    expect(result).toEqual({ dimensions: { width: 320, height: 240 }, capped: true });
  });
});

describe('resolveFrameRate', () => {
  test('automatic follows the quality preset', () => {
    expect(resolveFrameRate({ frameRate: 'auto', customFrameRate: 5, quality: 'low' })).toBe(10);
    expect(resolveFrameRate({ frameRate: 'auto', customFrameRate: 5, quality: 'veryHigh' })).toBe(
      24,
    );
  });

  test('explicit rates win', () => {
    expect(resolveFrameRate({ frameRate: 30, customFrameRate: 5, quality: 'low' })).toBe(30);
  });

  test('custom uses the typed rate', () => {
    expect(resolveFrameRate({ frameRate: 'custom', customFrameRate: 5, quality: 'low' })).toBe(5);
  });
});

describe('resolveSection', () => {
  test('full mode spans the whole video', () => {
    expect(resolveSection({ mode: 'full' }, 12)).toEqual({ start: 0, end: 12 });
  });

  test('clamps a section to the video length', () => {
    expect(resolveSection({ mode: 'range', start: 2, end: 30 }, 10)).toEqual({ start: 2, end: 10 });
  });

  test('keeps a minimum length when start is past the end', () => {
    const { start, end } = resolveSection({ mode: 'range', start: 20, end: 25 }, 10);
    expect(end - start).toBeCloseTo(MIN_SECTION_LENGTH);
    expect(end).toBe(10);
  });
});

describe('buildFrameTimeline', () => {
  test('spaces frames evenly from the start', () => {
    const { times } = buildFrameTimeline({ start: 1, end: 2, fps: 10 });
    expect(times).toHaveLength(10);
    expect(times[0]).toBe(1);
    expect(times[9]).toBeCloseTo(1.9);
  });

  test('distributes rounding so delays add up to the real duration', () => {
    const { delaysMs } = buildFrameTimeline({ start: 0, end: 1, fps: 30 });
    expect(delaysMs).toHaveLength(30);
    expect(delaysMs.reduce((sum, delay) => sum + delay, 0)).toBe(1000);
    expect(new Set(delaysMs)).toEqual(new Set([30, 40]));
  });

  test('always produces at least one frame inside the video', () => {
    const { times } = buildFrameTimeline({ start: 0, end: 0.01, fps: 10 });
    expect(times).toHaveLength(1);
    expect(times[0]).toBeLessThan(0.01);
  });

  test('speeding up captures moments further apart and keeps the frame delays', () => {
    const { times, delaysMs } = buildFrameTimeline({ start: 0, end: 2, fps: 10, speed: 2 });
    expect(times).toHaveLength(10);
    expect(times[1]).toBeCloseTo(0.2);
    expect(times[9]).toBeCloseTo(1.8);
    expect(new Set(delaysMs)).toEqual(new Set([100]));
  });

  test('slowing down captures moments closer together, making more frames', () => {
    const { times, delaysMs } = buildFrameTimeline({ start: 4, end: 5, fps: 10, speed: 0.5 });
    expect(times).toHaveLength(20);
    expect(times[1]).toBeCloseTo(4.05);
    expect(times[19]).toBeCloseTo(4.95);
    expect(delaysMs.reduce((sum, delay) => sum + delay, 0)).toBe(2000);
  });
});

describe('buildConversionPlan', () => {
  test('combines settings and metadata', () => {
    const plan = buildConversionPlan(
      {
        ...DEFAULT_SETTINGS,
        frameRate: 15,
        width: 320,
        section: { mode: 'range', start: 0, end: 2 },
      },
      { duration: 60, ...HD },
    );
    expect(plan.output).toEqual({ width: 320, height: 180 });
    expect(plan.frameTimes).toHaveLength(30);
    expect(plan.loop).toBe('infinite');
    expect(plan.speed).toBe(1);
  });

  test('a one-minute video at 2× becomes a 30 second GIF', () => {
    const plan = buildConversionPlan({ ...DEFAULT_SETTINGS, speed: 2 }, { duration: 60, ...HD });
    expect(gifDurationSeconds(plan)).toBe(30);
    expect(plan.frameTimes).toHaveLength(300);
    expect(plan.frameTimes[plan.frameTimes.length - 1]).toBeCloseTo(59.8);
  });

  test('a 10 second section at 0.5× becomes a 20 second GIF', () => {
    const plan = buildConversionPlan(
      { ...DEFAULT_SETTINGS, speed: 0.5, section: { mode: 'range', start: 5, end: 15 } },
      { duration: 60, ...HD },
    );
    expect(gifDurationSeconds(plan)).toBe(20);
    expect(plan.frameTimes[0]).toBe(5);
    expect(plan.frameTimes[plan.frameTimes.length - 1]).toBeCloseTo(14.95);
  });
});

test('exceedsMemoryBudget flags very large outputs', () => {
  const small = buildConversionPlan({ ...DEFAULT_SETTINGS, width: 480 }, { duration: 10, ...HD });
  const huge = buildConversionPlan(
    { ...DEFAULT_SETTINGS, width: 'original', frameRate: 30 },
    { duration: 600, ...HD },
  );
  expect(exceedsMemoryBudget(small)).toBe(false);
  expect(exceedsMemoryBudget(huge)).toBe(true);
});

test('maxSecondsWithinBudget gives the longest Full HD clip that fits in memory', () => {
  // 1.2 billion pixel-frames / (1920 × 1080 × 30 FPS) ≈ 19.3 s.
  expect(maxSecondsWithinBudget({ width: 1920, height: 1080 }, 30)).toBe(19);
  expect(maxSecondsWithinBudget({ width: 480, height: 270 }, 15)).toBeGreaterThan(600);
});

test('speeding up fits more video in memory, slowing down fits less', () => {
  const fullHd = { width: 1920, height: 1080 };
  expect(maxSecondsWithinBudget(fullHd, 30, 2)).toBe(38);
  expect(maxSecondsWithinBudget(fullHd, 30, 0.5)).toBe(9);
});

describe('quality tuning', () => {
  const metadata = { duration: 10, ...HD };

  test('the plan carries the preset encoding, with tuning applied on top', () => {
    const preset = buildConversionPlan({ ...DEFAULT_SETTINGS, quality: 'ultra' }, metadata);
    expect(preset.encoding).toMatchObject({
      maxColors: 256,
      dither: 'diffusion',
      paletteMode: 'perFrame',
    });

    const tuned = buildConversionPlan(
      { ...DEFAULT_SETTINGS, quality: 'ultra', tuning: { dither: 'ordered', pixelSkip: 'strong' } },
      metadata,
    );
    expect(tuned.encoding).toMatchObject({ dither: 'ordered', unchangedPixelThreshold: 24 });
  });

  test('lossy compression follows the preset unless tuned', () => {
    const preset = buildConversionPlan({ ...DEFAULT_SETTINGS, quality: 'low' }, metadata);
    expect(preset.encoding.lossyTolerance).toBeGreaterThan(0);

    const exact = buildConversionPlan(
      { ...DEFAULT_SETTINGS, quality: 'low', tuning: { lossy: 'off' } },
      metadata,
    );
    expect(exact.encoding.lossyTolerance).toBe(0);
  });

  test('Full HD is a width option and is never upscaled', () => {
    const plan = buildConversionPlan(
      { ...DEFAULT_SETTINGS, width: 1920 },
      { duration: 5, width: 1280, height: 720 },
    );
    expect(plan.output).toEqual({ width: 1280, height: 720 });
    expect(plan.widthCapped).toBe(true);
  });
});

test('pickSampleTimes spreads samples across the clip, including both ends', () => {
  const times = Array.from({ length: 100 }, (_, i) => i);
  expect(pickSampleTimes(times, 5)).toEqual([0, 25, 50, 74, 99]);
  expect(pickSampleTimes([1, 2], 8)).toEqual([1, 2]);
});
