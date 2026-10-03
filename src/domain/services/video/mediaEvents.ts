import { ConversionError, mediaErrorToConversionError } from '@/domain/helpers/conversionErrors';

interface WaitOptions {
  timeoutMs: number;
  signal?: AbortSignal;
  /** Error to raise when the event never fires. Stalled decoding usually means a broken file. */
  timeoutError?: ConversionError;
}

/** Resolves on the given media event, rejecting on media errors, timeout or abort. */
export function waitForMediaEvent(
  video: HTMLVideoElement,
  eventName: 'loadedmetadata' | 'loadeddata' | 'seeked',
  { timeoutMs, signal, timeoutError = new ConversionError('corrupted') }: WaitOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ConversionError('cancelled'));
      return;
    }

    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener(eventName, onEvent);
      video.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(mediaErrorToConversionError(video.error));
    };
    const onAbort = () => {
      cleanup();
      reject(new ConversionError('cancelled'));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(timeoutError);
    }, timeoutMs);

    video.addEventListener(eventName, onEvent);
    video.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort);
  });
}

export function createHiddenVideo(sourceUrl: string, preload: 'metadata' | 'auto'): HTMLVideoElement {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = preload;
  video.src = sourceUrl;
  return video;
}

/** Releases the decoder. Browsers keep media pipelines alive until `src` is cleared. */
export function releaseVideo(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute('src');
  video.load();
}

const SEEK_TOLERANCE_SECONDS = 1e-4;

export async function seekVideo(
  video: HTMLVideoElement,
  time: number,
  options: Omit<WaitOptions, 'timeoutError'>,
): Promise<void> {
  if (
    Math.abs(video.currentTime - time) < SEEK_TOLERANCE_SECONDS &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
  ) {
    return;
  }
  const seeked = waitForMediaEvent(video, 'seeked', options);
  video.currentTime = time;
  await seeked;
}
