import { useCallback, useEffect, useReducer, useRef } from 'react';

import { toConversionError } from '@/domain/helpers/conversionErrors';
import { looksLikeMp4 } from '@/domain/helpers/fileValidation';
import { initialQueueState, queueReducer } from '@/domain/helpers/queueReducer';
import { probeVideo } from '@/domain/services/video/videoProbe.service';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { QueueItem } from '@/domain/types/queue';

function createQueueItem(file: File): QueueItem {
  return {
    id: crypto.randomUUID(),
    file,
    sourceUrl: URL.createObjectURL(file),
    metadata: null,
    thumbnailUrl: null,
    status: 'analyzing',
    progress: 0,
    error: null,
    customSettings: null,
    result: null,
    wasCancelled: false,
  };
}

function revokeItemUrls(item: QueueItem): void {
  URL.revokeObjectURL(item.sourceUrl);
  if (item.thumbnailUrl) URL.revokeObjectURL(item.thumbnailUrl);
  if (item.result) URL.revokeObjectURL(item.result.url);
}

export interface AddFilesOutcome {
  added: number;
  rejected: string[];
}

/** Owns the file queue: importing, analyzing, per-file settings and cleanup of object URLs. */
export function useConversionQueue() {
  const [state, dispatch] = useReducer(queueReducer, initialQueueState);
  // Async work (probing, the batch runner) needs the latest state, not the render-time copy.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const analyze = useCallback(async (item: QueueItem) => {
    try {
      const { metadata, thumbnailUrl } = await probeVideo(item.file, item.sourceUrl);
      const stillQueued = stateRef.current.items.some((queued) => queued.id === item.id);
      if (!stillQueued) {
        URL.revokeObjectURL(thumbnailUrl);
        return;
      }
      dispatch({ type: 'itemAnalyzed', id: item.id, metadata, thumbnailUrl });
    } catch (error) {
      const { code, message } = toConversionError(error);
      dispatch({ type: 'itemFailed', id: item.id, error: { code, message } });
    }
  }, []);

  const addFiles = useCallback(
    (files: File[]): AddFilesOutcome => {
      const accepted = files.filter(looksLikeMp4);
      const rejected = files.filter((file) => !looksLikeMp4(file)).map((file) => file.name);
      const items = accepted.map(createQueueItem);
      if (items.length > 0) dispatch({ type: 'itemsAdded', items });
      // Probe one at a time: parallel decoders compete for memory and hardware decode slots.
      void items.reduce<Promise<void>>((chain, item) => chain.then(() => analyze(item)), Promise.resolve());
      return { added: items.length, rejected };
    },
    [analyze],
  );

  const removeItem = useCallback((id: string) => {
    const item = stateRef.current.items.find((queued) => queued.id === id);
    if (item) revokeItemUrls(item);
    dispatch({ type: 'itemRemoved', id });
  }, []);

  const clearQueue = useCallback(() => {
    stateRef.current.items.forEach(revokeItemUrls);
    dispatch({ type: 'queueCleared' });
  }, []);

  const clearCompleted = useCallback(() => {
    stateRef.current.items.filter((item) => item.status === 'completed').forEach(revokeItemUrls);
    dispatch({ type: 'completedCleared' });
  }, []);

  const requeueItem = useCallback((id: string) => {
    const item = stateRef.current.items.find((queued) => queued.id === id);
    if (item?.result) URL.revokeObjectURL(item.result.url);
    dispatch({ type: 'itemRequeued', id });
  }, []);

  const setSettings = useCallback((settings: ConversionSettings) => {
    dispatch({ type: 'settingsChanged', settings });
  }, []);

  const setCustomSettings = useCallback((id: string, settings: ConversionSettings | null) => {
    dispatch({ type: 'customSettingsChanged', id, settings });
  }, []);

  return {
    state,
    stateRef,
    dispatch,
    addFiles,
    removeItem,
    clearQueue,
    clearCompleted,
    requeueItem,
    setSettings,
    setCustomSettings,
  };
}
