export type ConversionErrorCode =
  | 'invalid-mp4'
  | 'corrupted'
  | 'unsupported-encoding'
  | 'conversion-failed'
  | 'file-too-large'
  | 'insufficient-memory'
  | 'cancelled';

export const CONVERSION_ERROR_MESSAGES: Record<ConversionErrorCode, string> = {
  'invalid-mp4': "This file isn't a valid MP4 video.",
  corrupted: 'The video looks corrupted or incomplete and could not be read.',
  'unsupported-encoding':
    "This MP4 uses a video encoding your browser can't decode (for example HEVC/H.265 in some browsers). Try re-exporting it as H.264.",
  'conversion-failed': 'Something went wrong while creating the GIF. Try again or use lower settings.',
  'file-too-large': 'This file is larger than the 2 GB limit for in-browser conversion.',
  'insufficient-memory':
    'Not enough memory to build this GIF. Try a smaller width, a lower frame rate, or a shorter section.',
  cancelled: 'Conversion was cancelled.',
};

export class ConversionError extends Error {
  readonly code: ConversionErrorCode;

  constructor(code: ConversionErrorCode, detail?: string) {
    super(detail ?? CONVERSION_ERROR_MESSAGES[code]);
    this.name = 'ConversionError';
    this.code = code;
  }
}

function isOutOfMemoryError(error: unknown): boolean {
  if (error instanceof RangeError) return true;
  if (!(error instanceof Error)) return false;
  return /out of memory|allocation failed|array buffer allocation/i.test(error.message);
}

/** Normalizes anything thrown during conversion into a ConversionError with a known code. */
export function toConversionError(error: unknown): ConversionError {
  if (error instanceof ConversionError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ConversionError('cancelled');
  }
  if (isOutOfMemoryError(error)) return new ConversionError('insufficient-memory');
  return new ConversionError('conversion-failed');
}

/** Maps an HTMLMediaElement error code to the matching conversion error. */
export function mediaErrorToConversionError(mediaError: MediaError | null): ConversionError {
  if (!mediaError) return new ConversionError('corrupted');
  switch (mediaError.code) {
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return new ConversionError('unsupported-encoding');
    case MediaError.MEDIA_ERR_DECODE:
      return new ConversionError('corrupted');
    default:
      return new ConversionError('conversion-failed');
  }
}
