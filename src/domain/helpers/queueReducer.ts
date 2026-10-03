import { uniqueGifName } from '@/domain/helpers/fileNaming';
import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import type { ConversionSettings, VideoMetadata } from '@/domain/types/conversion';
import type { GifResult, QueueItem, QueueItemError } from '@/domain/types/queue';

export interface QueueState {
  items: QueueItem[];
  settings: ConversionSettings;
}

export type QueueAction =
  | { type: 'itemsAdded'; items: QueueItem[] }
  | { type: 'itemAnalyzed'; id: string; metadata: VideoMetadata; thumbnailUrl: string }
  | { type: 'itemFailed'; id: string; error: QueueItemError }
  | { type: 'itemRemoved'; id: string }
  | { type: 'itemRequeued'; id: string }
  | { type: 'queueCleared' }
  | { type: 'completedCleared' }
  | { type: 'settingsChanged'; settings: ConversionSettings }
  | { type: 'customSettingsChanged'; id: string; settings: ConversionSettings | null }
  | { type: 'conversionStarted'; id: string }
  | { type: 'conversionProgressed'; id: string; progress: number }
  | { type: 'conversionCompleted'; id: string; result: Omit<GifResult, 'fileName'> }
  | { type: 'conversionCancelled'; id: string };

export const initialQueueState: QueueState = { items: [], settings: DEFAULT_SETTINGS };

function updateItem(
  state: QueueState,
  id: string,
  update: (item: QueueItem) => QueueItem,
): QueueState {
  if (!state.items.some((item) => item.id === id)) return state;
  return { ...state, items: state.items.map((item) => (item.id === id ? update(item) : item)) };
}

export function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'itemsAdded':
      return { ...state, items: [...state.items, ...action.items] };

    case 'itemAnalyzed':
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: 'waiting',
        metadata: action.metadata,
        thumbnailUrl: action.thumbnailUrl,
      }));

    case 'itemFailed':
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: 'error',
        progress: 0,
        error: action.error,
      }));

    case 'itemRemoved':
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };

    case 'itemRequeued':
      return updateItem(state, action.id, (item) =>
        // Items that failed during analysis have no metadata and can't be converted.
        item.metadata
          ? { ...item, status: 'waiting', progress: 0, error: null, result: null, wasCancelled: false }
          : item,
      );

    case 'queueCleared':
      return { ...state, items: [] };

    case 'completedCleared':
      return { ...state, items: state.items.filter((item) => item.status !== 'completed') };

    case 'settingsChanged':
      return { ...state, settings: action.settings };

    case 'customSettingsChanged':
      return updateItem(state, action.id, (item) => ({ ...item, customSettings: action.settings }));

    case 'conversionStarted':
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: 'processing',
        progress: 0,
        error: null,
        wasCancelled: false,
      }));

    case 'conversionProgressed':
      return updateItem(state, action.id, (item) =>
        item.status === 'processing' ? { ...item, progress: action.progress } : item,
      );

    case 'conversionCompleted': {
      const takenNames = state.items
        .filter((item) => item.id !== action.id && item.result)
        .map((item) => item.result?.fileName ?? '');
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: 'completed',
        progress: 1,
        result: { ...action.result, fileName: uniqueGifName(item.file.name, takenNames) },
      }));
    }

    case 'conversionCancelled':
      return updateItem(state, action.id, (item) => ({
        ...item,
        status: 'waiting',
        progress: 0,
        wasCancelled: true,
      }));
  }
}
