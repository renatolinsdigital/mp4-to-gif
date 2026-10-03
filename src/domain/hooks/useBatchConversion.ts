import { useCallback, useRef, useState, type Dispatch, type RefObject } from 'react';

import { buildConversionPlan } from '@/domain/helpers/conversionPlan';
import { toConversionError } from '@/domain/helpers/conversionErrors';
import type { QueueAction, QueueState } from '@/domain/helpers/queueReducer';
import { convertToGif } from '@/domain/services/gifConversion.service';
import type { QueueItem } from '@/domain/types/queue';

export interface BatchSummary {
  converted: number;
  failed: number;
  cancelled: number;
}

interface UseBatchConversionOptions {
  stateRef: RefObject<QueueState>;
  dispatch: Dispatch<QueueAction>;
  onBatchFinished: (summary: BatchSummary) => void;
}

export interface BatchRun {
  isRunning: boolean;
  currentItemId: string | null;
  /** IDs picked up by the current or most recent run, in processing order. */
  runItemIds: string[];
}

const IDLE_RUN: BatchRun = { isRunning: false, currentItemId: null, runItemIds: [] };

// Progress events arrive per frame; throttling keeps re-renders cheap on long clips.
const PROGRESS_THROTTLE_MS = 100;

/**
 * Converts waiting items one at a time. Files added mid-run join the same run, and a
 * failure only marks that item as errored. See business rule "Errors are isolated per file".
 */
export function useBatchConversion({ stateRef, dispatch, onBatchFinished }: UseBatchConversionOptions) {
  const [run, setRun] = useState<BatchRun>(IDLE_RUN);
  const controllerRef = useRef<AbortController | null>(null);
  const cancelAllRef = useRef(false);
  const runningRef = useRef(false);

  const convertItem = useCallback(
    async (item: QueueItem): Promise<'converted' | 'failed' | 'cancelled'> => {
      const metadata = item.metadata;
      if (!metadata) return 'failed';

      const settings = item.customSettings ?? stateRef.current.settings;
      const plan = buildConversionPlan(settings, metadata);
      const controller = new AbortController();
      controllerRef.current = controller;
      dispatch({ type: 'conversionStarted', id: item.id });

      let lastProgressAt = 0;
      try {
        const { blob, frameCount } = await convertToGif({
          sourceUrl: item.sourceUrl,
          plan,
          signal: controller.signal,
          onProgress: (progress) => {
            const now = performance.now();
            if (progress < 1 && now - lastProgressAt < PROGRESS_THROTTLE_MS) return;
            lastProgressAt = now;
            dispatch({ type: 'conversionProgressed', id: item.id, progress });
          },
        });
        const stillQueued = stateRef.current.items.some((queued) => queued.id === item.id);
        if (!stillQueued) return 'cancelled';
        dispatch({
          type: 'conversionCompleted',
          id: item.id,
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
          dispatch({ type: 'conversionCancelled', id: item.id });
          return 'cancelled';
        }
        dispatch({ type: 'itemFailed', id: item.id, error: { code, message } });
        return 'failed';
      } finally {
        controllerRef.current = null;
      }
    },
    [dispatch, stateRef],
  );

  const convertAll = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    cancelAllRef.current = false;

    const attempted = new Set<string>();
    const nextWaitingItem = (): QueueItem | undefined =>
      stateRef.current.items.find((item) => item.status === 'waiting' && !attempted.has(item.id));
    const summary: BatchSummary = { converted: 0, failed: 0, cancelled: 0 };
    setRun({ isRunning: true, currentItemId: null, runItemIds: [] });

    for (let item = nextWaitingItem(); item; item = nextWaitingItem()) {
      if (cancelAllRef.current) break;
      attempted.add(item.id);
      const current = item;
      setRun((previous) => ({
        isRunning: true,
        currentItemId: current.id,
        runItemIds: [...previous.runItemIds, current.id],
      }));
      summary[await convertItem(current)]++;
    }

    runningRef.current = false;
    setRun((previous) => ({ ...previous, isRunning: false, currentItemId: null }));
    onBatchFinished(summary);
  }, [convertItem, onBatchFinished, stateRef]);

  const cancelCurrent = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const cancelAll = useCallback(() => {
    cancelAllRef.current = true;
    controllerRef.current?.abort();
  }, []);

  return { run, convertAll, cancelCurrent, cancelAll };
}
