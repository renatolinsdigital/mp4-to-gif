import type { ConversionErrorCode } from '@/domain/helpers/conversionErrors';
import type { GifEncodingOptions } from '@/domain/services/gif/gifEncodingSession';

/** Messages from the main thread to the encoder worker. Every request gets one reply. */
export type EncoderRequest =
  | { id: number; type: 'init'; options: GifEncodingOptions }
  | { id: number; type: 'palette'; samples: ArrayBuffer[] }
  | { id: number; type: 'frame'; pixels: ArrayBuffer; delayMs: number }
  | { id: number; type: 'finish' };

export type EncoderResponse =
  | { id: number; type: 'ack' }
  | { id: number; type: 'result'; bytes: ArrayBuffer; frameCount: number }
  | { id: number; type: 'error'; code: ConversionErrorCode; message: string };
