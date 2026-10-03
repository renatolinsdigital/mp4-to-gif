import { exceedsMemoryBudget, pickSampleTimes } from '@/domain/helpers/conversionPlan';
import { ConversionError, toConversionError } from '@/domain/helpers/conversionErrors';
import { GifEncoderClient } from '@/domain/services/gif/gifEncoderClient';
import { createFrameExtractor } from '@/domain/services/video/frameExtractor.service';
import type { ConversionPlan } from '@/domain/types/conversion';

const PALETTE_SAMPLE_COUNT = 8;
// Frames handed to the worker before waiting for it to catch up. Keeps decode and encode
// overlapping without letting raw frames pile up in memory.
const MAX_FRAMES_IN_FLIGHT = 3;
const PALETTE_PHASE_SHARE = 0.08;

export interface ConvertToGifOptions {
  sourceUrl: string;
  plan: ConversionPlan;
  signal: AbortSignal;
  onProgress: (progress: number) => void;
}

export interface ConvertToGifResult {
  blob: Blob;
  frameCount: number;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new ConversionError('cancelled');
}

export async function convertToGif({
  sourceUrl,
  plan,
  signal,
  onProgress,
}: ConvertToGifOptions): Promise<ConvertToGifResult> {
  if (exceedsMemoryBudget(plan)) throw new ConversionError('insufficient-memory');

  const { encoding } = plan;
  let extractor: Awaited<ReturnType<typeof createFrameExtractor>> | null = null;
  let encoder: GifEncoderClient | null = null;
  const abortEncoder = () => encoder?.dispose();
  signal.addEventListener('abort', abortEncoder);

  try {
    extractor = await createFrameExtractor(sourceUrl, plan.output, signal);
    encoder = await GifEncoderClient.create({
      width: plan.output.width,
      height: plan.output.height,
      frameSize: extractor.frameSize,
      ...encoding,
      repeat: plan.loop === 'infinite' ? 0 : -1,
    });

    let progressBase = 0;
    if (encoding.paletteMode === 'global') {
      const samples: ImageData[] = [];
      for (const time of pickSampleTimes(plan.frameTimes, PALETTE_SAMPLE_COUNT)) {
        throwIfAborted(signal);
        samples.push(await extractor.extract(time));
      }
      await encoder.setPaletteSamples(samples);
      progressBase = PALETTE_PHASE_SHARE;
      onProgress(progressBase);
    }

    const total = plan.frameTimes.length;
    let encoded = 0;
    const inFlight: Promise<void>[] = [];

    for (let i = 0; i < total; i++) {
      throwIfAborted(signal);
      const frame = await extractor.extract(plan.frameTimes[i] as number);
      const pending = encoder.encodeFrame(frame, plan.frameDelaysMs[i] as number).then(() => {
        encoded++;
        onProgress(progressBase + (1 - progressBase) * (encoded / total) * 0.98);
      });
      // Errors are surfaced when the promise is awaited below; this only prevents an
      // "unhandled rejection" report if the loop exits early for another reason.
      pending.catch(() => undefined);
      inFlight.push(pending);
      if (inFlight.length >= MAX_FRAMES_IN_FLIGHT) await inFlight.shift();
    }
    await Promise.all(inFlight);

    const { bytes, frameCount } = await encoder.finish();
    onProgress(1);
    return { blob: new Blob([bytes], { type: 'image/gif' }), frameCount };
  } catch (error) {
    if (signal.aborted) throw new ConversionError('cancelled');
    throw toConversionError(error);
  } finally {
    signal.removeEventListener('abort', abortEncoder);
    extractor?.dispose();
    encoder?.dispose();
  }
}
