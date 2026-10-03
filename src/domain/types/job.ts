import type { ConversionErrorCode } from '@/domain/helpers/conversionErrors';
import type { ConversionSettings, Dimensions, VideoMetadata } from '@/domain/types/conversion';

/**
 * `analyzing` is the short window after import while metadata and the poster frame load.
 * `ready` means the file can be converted; it is also where a cancelled conversion returns.
 */
export type JobStatus = 'analyzing' | 'ready' | 'processing' | 'completed' | 'error';

export interface JobError {
  code: ConversionErrorCode;
  message: string;
}

export interface GifResult {
  url: string;
  blob: Blob;
  fileName: string;
  dimensions: Dimensions;
  frameCount: number;
  size: number;
  /** Settings used to produce this result, kept so the result can describe it. */
  settings: ConversionSettings;
}

/** The one video being converted. The converter handles a single file at a time. */
export interface ConversionJob {
  id: string;
  file: File;
  /** Object URL for the source file, used for playback and frame extraction. */
  sourceUrl: string;
  metadata: VideoMetadata | null;
  /** Still frame shown as the video's poster until it plays. */
  posterUrl: string | null;
  status: JobStatus;
  /** 0 to 1 while processing. */
  progress: number;
  error: JobError | null;
  result: GifResult | null;
}
