import { z } from 'zod';

import type { ConversionSettings } from '@/domain/types/conversion';

export const MIN_CUSTOM_WIDTH = 16;
export const MAX_CUSTOM_WIDTH = 3840;

/**
 * Speeds offered by the speed slider. A list rather than a linear range so slow motion gets
 * as much of the track as fast forward, with 1× near the middle.
 */
export const SPEED_STEPS: readonly number[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export const DEFAULT_SETTINGS: ConversionSettings = {
  quality: 'medium',
  tuning: {},
  frameRate: 10,
  width: 720,
  customWidth: 640,
  loop: 'infinite',
  section: { mode: 'full' },
  speed: 1,
};

export const customWidthSchema = z.coerce
  .number({ error: 'Enter a width in pixels.' })
  .int('Use a whole number of pixels.')
  .min(MIN_CUSTOM_WIDTH, `Width must be at least ${MIN_CUSTOM_WIDTH} px.`)
  .max(MAX_CUSTOM_WIDTH, `Width can be at most ${MAX_CUSTOM_WIDTH} px.`);

const secondsSchema = z.coerce
  .number({ error: 'Enter a time in seconds.' })
  .min(0, 'Time cannot be negative.');

export const sectionSchema = z
  .object({ start: secondsSchema, end: secondsSchema })
  .refine((value) => value.end > value.start, {
    message: 'End must be after start.',
    path: ['end'],
  });

export function validateCustomWidth(input: string): { value: number } | { error: string } {
  const parsed = customWidthSchema.safeParse(input);
  if (parsed.success) return { value: parsed.data };
  return { error: parsed.error.issues[0]?.message ?? 'Invalid width.' };
}
