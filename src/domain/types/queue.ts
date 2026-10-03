import type { ConversionErrorCode } from '@/domain/helpers/conversionErrors';
import type { ConversionSettings, Dimensions, VideoMetadata } from '@/domain/types/conversion';

/**
 * `analyzing` is the short window after import while metadata and the thumbnail load.
 * The four user-facing conversion states are waiting, processing, completed and error.
 */
export type QueueItemStatus = 'analyzing' | 'waiting' | 'processing' | 'completed' | 'error';

export interface QueueItemError {
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
  /** Settings used to produce this result, kept so the card can describe it. */
  settings: ConversionSettings;
}

export interface QueueItem {
  id: string;
  file: File;
  /** Object URL for the source file, used for preview and frame extraction. */
  sourceUrl: string;
  metadata: VideoMetadata | null;
  thumbnailUrl: string | null;
  status: QueueItemStatus;
  /** 0 to 1 while processing. */
  progress: number;
  error: QueueItemError | null;
  /** Per-file settings. `null` means the item follows the global settings. */
  customSettings: ConversionSettings | null;
  result: GifResult | null;
  /** Set when the user cancelled this item, so the UI can explain why it is still waiting. */
  wasCancelled: boolean;
}
