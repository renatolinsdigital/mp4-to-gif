import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import type { ConversionJob, GifResult } from '@/domain/types/job';

let counter = 0;

export function makeJob(overrides: Partial<ConversionJob> = {}): ConversionJob {
  counter++;
  const name = overrides.file?.name ?? `clip-${counter}.mp4`;
  return {
    id: `job-${counter}`,
    file: new File([new Uint8Array(2048)], name, { type: 'video/mp4' }),
    sourceUrl: `blob:source-${counter}`,
    metadata: { duration: 12, width: 1920, height: 1080 },
    posterUrl: null,
    status: 'ready',
    progress: 0,
    error: null,
    result: null,
    ...overrides,
  };
}

export function makeGifResult(overrides: Partial<GifResult> = {}): GifResult {
  return {
    url: 'blob:gif',
    blob: new Blob([new Uint8Array(4096)], { type: 'image/gif' }),
    fileName: 'clip.gif',
    dimensions: { width: 480, height: 270 },
    frameCount: 120,
    size: 4096,
    settings: DEFAULT_SETTINGS,
    ...overrides,
  };
}
