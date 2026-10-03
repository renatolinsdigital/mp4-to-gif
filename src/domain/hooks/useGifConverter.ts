import { useCallback, useEffect, useReducer, useRef } from 'react';

import { buildConversionPlan } from '@/domain/helpers/conversionPlan';
import { toConversionError } from '@/domain/helpers/conversionErrors';
import { converterReducer, initialConverterState } from '@/domain/helpers/converterReducer';
import { convertToGif } from '@/domain/services/gifConversion.service';
import { probeVideo } from '@/domain/services/video/videoProbe.service';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { ConversionJob } from '@/domain/types/job';

export type ConversionOutcome = 'converted' | 'failed' | 'cancelled';

// Progress events arrive per frame; throttling keeps re-renders cheap on long clips.
const PROGRESS_THROTTLE_MS = 100;

function createJob(file: File): ConversionJob {
  return {
    id: crypto.randomUUID(),
    file,
    sourceUrl: URL.createObjectURL(file),
    metadata: null,
    posterUrl: null,
    status: 'analyzing',
    progress: 0,
    error: null,
    result: null,
  };
}

function revokeJobUrls(job: ConversionJob): void {
  URL.revokeObjectURL(job.sourceUrl);
  if (job.posterUrl) URL.revokeObjectURL(job.posterUrl);
  if (job.result) URL.revokeObjectURL(job.result.url);
}

/** Owns the single file being converted: import, analysis, conversion and URL cleanup. */
export function useGifConverter() {
  const [state, dispatch] = useReducer(converterReducer, initialConverterState);
  // Async work (probing, converting) needs the latest state, not the render-time copy.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  const controllerRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const clearFile = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    const { job } = stateRef.current;
    if (job) revokeJobUrls(job);
    dispatch({ type: 'fileCleared' });
  }, []);

  /** Replaces the current file, if any, and analyzes the new one. */
  const loadFile = useCallback(
    async (file: File) => {
      clearFile();
      const job = createJob(file);
      // Mirror the reducer now so a quick replace or removal sees this job.
      stateRef.current = { ...stateRef.current, job };
      dispatch({ type: 'fileLoaded', job });
      try {
        const { metadata, thumbnailUrl } = await probeVideo(file, job.sourceUrl);
        if (stateRef.current.job?.id !== job.id) {
          URL.revokeObjectURL(thumbnailUrl);
          return;
        }
        dispatch({ type: 'fileAnalyzed', id: job.id, metadata, posterUrl: thumbnailUrl });
      } catch (error) {
        const { code, message } = toConversionError(error);
        dispatch({ type: 'jobFailed', id: job.id, error: { code, message } });
      }
    },
    [clearFile],
  );

  const setSettings = useCallback((settings: ConversionSettings) => {
    dispatch({ type: 'settingsChanged', settings });
  }, []);

  const convert = useCallback(async (): Promise<ConversionOutcome | null> => {
    const { job, settings } = stateRef.current;
    if (!job?.metadata || job.status === 'processing' || controllerRef.current) return null;

    const plan = buildConversionPlan(settings, job.metadata);
    const controller = new AbortController();
    controllerRef.current = controller;
    dispatch({ type: 'conversionStarted', id: job.id });

    let lastProgressAt = 0;
    try {
      const { blob, frameCount } = await convertToGif({
        sourceUrl: job.sourceUrl,
        plan,
        signal: controller.signal,
        onProgress: (progress) => {
          const now = performance.now();
          if (progress < 1 && now - lastProgressAt < PROGRESS_THROTTLE_MS) return;
          lastProgressAt = now;
          dispatch({ type: 'conversionProgressed', id: job.id, progress });
        },
      });
      const current = stateRef.current.job;
      if (current?.id !== job.id) return 'cancelled';
      // The new GIF replaces the previous one, so release the old blob.
      if (current.result) URL.revokeObjectURL(current.result.url);
      dispatch({
        type: 'conversionCompleted',
        id: job.id,
        result: {
          url: URL.createObjectURL(blob),
          blob,
          dimensions: plan.output,
          frameCount,
          size: blob.size,
          settings,
        },
      });
      return 'converted';
    } catch (error) {
      const { code, message } = toConversionError(error);
      if (code === 'cancelled') {
        dispatch({ type: 'conversionCancelled', id: job.id });
        return 'cancelled';
      }
      dispatch({ type: 'jobFailed', id: job.id, error: { code, message } });
      return 'failed';
    } finally {
      // A replaced file aborts this run; don't clear a controller a newer run has set.
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, []);

  return { state, loadFile, clearFile, setSettings, convert, cancel };
}
