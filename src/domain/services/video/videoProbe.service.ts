import { ConversionError } from '@/domain/helpers/conversionErrors';
import { assertConvertibleMp4 } from '@/domain/helpers/fileValidation';
import {
  createHiddenVideo,
  releaseVideo,
  seekVideo,
  waitForMediaEvent,
} from '@/domain/services/video/mediaEvents';
import type { VideoMetadata } from '@/domain/types/conversion';

const METADATA_TIMEOUT_MS = 15_000;
const THUMBNAIL_TIMEOUT_MS = 15_000;
const THUMBNAIL_WIDTH = 192;

export interface ProbeResult {
  metadata: VideoMetadata;
  thumbnailUrl: string;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ConversionError('conversion-failed'))),
      'image/jpeg',
      0.8,
    );
  });
}

async function captureThumbnail(video: HTMLVideoElement, metadata: VideoMetadata): Promise<string> {
  // A frame slightly into the clip avoids the black or fade-in frame many videos start with.
  await seekVideo(video, Math.min(1, metadata.duration * 0.25), {
    timeoutMs: THUMBNAIL_TIMEOUT_MS,
  });

  const canvas = document.createElement('canvas');
  canvas.width = THUMBNAIL_WIDTH;
  canvas.height = Math.max(1, Math.round((metadata.height * THUMBNAIL_WIDTH) / metadata.width));
  const context = canvas.getContext('2d');
  if (!context) throw new ConversionError('insufficient-memory');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return URL.createObjectURL(await canvasToBlob(canvas));
}

/**
 * Validates the file and reads its duration, resolution and a thumbnail. Decoding a frame
 * here (not just metadata) catches unsupported codecs at import time rather than mid-conversion.
 */
export async function probeVideo(file: File, sourceUrl: string): Promise<ProbeResult> {
  await assertConvertibleMp4(file);

  const video = createHiddenVideo(sourceUrl, 'auto');
  try {
    await waitForMediaEvent(video, 'loadedmetadata', { timeoutMs: METADATA_TIMEOUT_MS });

    if (!Number.isFinite(video.duration) || video.duration <= 0) {
      throw new ConversionError('corrupted');
    }
    // Metadata with no picture size means there is no video track the browser can decode.
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      throw new ConversionError('unsupported-encoding');
    }

    const metadata: VideoMetadata = {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
    const thumbnailUrl = await captureThumbnail(video, metadata);
    return { metadata, thumbnailUrl };
  } finally {
    releaseVideo(video);
  }
}
