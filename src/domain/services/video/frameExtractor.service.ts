import { ConversionError } from '@/domain/helpers/conversionErrors';
import { halvingSteps } from '@/domain/helpers/resample';
import {
  createHiddenVideo,
  releaseVideo,
  seekVideo,
  waitForMediaEvent,
} from '@/domain/services/video/mediaEvents';
import type { Dimensions } from '@/domain/types/conversion';

const LOAD_TIMEOUT_MS = 20_000;
const SEEK_TIMEOUT_MS = 20_000;

export interface FrameExtractor {
  /**
   * Size of the frames `extract` returns: the video halved toward the output size, never
   * below it. The encoder resamples them to the exact output size.
   */
  readonly frameSize: Dimensions;
  /** Seeks to `time` and returns the frame at `frameSize`. */
  extract(time: number): Promise<ImageData>;
  dispose(): void;
}

function createCanvas({ width, height }: Dimensions): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true, alpha: false });
  if (!context) throw new ConversionError('insufficient-memory');
  return { canvas, context };
}

/**
 * Decodes frames with the browser's own video decoder by seeking a hidden video element
 * and drawing it to a canvas. Seeking is slower than playback but frame-accurate.
 *
 * The browser scales video with plain bilinear filtering, which aliases badly past 2×, so
 * frames are only ever drawn at exactly half size per step (a clean 2×2 average). The last
 * factor below 2 is left to the encoder's Lanczos resampler.
 */
export async function createFrameExtractor(
  sourceUrl: string,
  output: Dimensions,
  signal: AbortSignal,
): Promise<FrameExtractor> {
  const video = createHiddenVideo(sourceUrl, 'auto');
  const canvases: HTMLCanvasElement[] = [];
  const release = () => {
    releaseVideo(video);
    for (const canvas of canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
  };

  try {
    await waitForMediaEvent(video, 'loadeddata', { timeoutMs: LOAD_TIMEOUT_MS, signal });
    const source = { width: video.videoWidth, height: video.videoHeight };
    const steps = halvingSteps(source, output);
    const stages = (steps.length > 0 ? steps : [source]).map(createCanvas);
    canvases.push(...stages.map((stage) => stage.canvas));
    const last = stages[stages.length - 1] as (typeof stages)[number];

    return {
      frameSize: { width: last.canvas.width, height: last.canvas.height },
      async extract(time) {
        await seekVideo(video, time, { timeoutMs: SEEK_TIMEOUT_MS, signal });
        let previous: CanvasImageSource = video;
        for (const { canvas, context } of stages) {
          context.drawImage(previous, 0, 0, canvas.width, canvas.height);
          previous = canvas;
        }
        return last.context.getImageData(0, 0, last.canvas.width, last.canvas.height);
      },
      dispose: release,
    };
  } catch (error) {
    release();
    throw error;
  }
}
