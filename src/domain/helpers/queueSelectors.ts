import {
  buildConversionPlan,
  estimateGifSize,
  exceedsMemoryBudget,
} from '@/domain/helpers/conversionPlan';
import type { ConversionSettings } from '@/domain/types/conversion';
import type { QueueItem } from '@/domain/types/queue';

export function effectiveSettings(
  item: QueueItem,
  globalSettings: ConversionSettings,
): ConversionSettings {
  return item.customSettings ?? globalSettings;
}

export function waitingItems(items: QueueItem[]): QueueItem[] {
  return items.filter((item) => item.status === 'waiting');
}

export function completedItems(items: QueueItem[]): QueueItem[] {
  return items.filter((item) => item.status === 'completed' && item.result);
}

/**
 * Estimated total size of the waiting GIFs that fit in memory, or null if none do.
 * Oversized items are left out because their conversion will be refused.
 */
export function estimateQueueOutputSize(
  items: QueueItem[],
  globalSettings: ConversionSettings,
): number | null {
  let total = 0;
  let counted = 0;
  for (const item of waitingItems(items)) {
    if (!item.metadata) continue;
    const plan = buildConversionPlan(effectiveSettings(item, globalSettings), item.metadata);
    if (exceedsMemoryBudget(plan)) continue;
    total += estimateGifSize(plan);
    counted++;
  }
  return counted > 0 ? total : null;
}

/** Waiting items whose GIF would not fit in browser memory with their current settings. */
export function oversizedItems(
  items: QueueItem[],
  globalSettings: ConversionSettings,
): QueueItem[] {
  return waitingItems(items).filter(
    (item) =>
      !!item.metadata &&
      exceedsMemoryBudget(
        buildConversionPlan(effectiveSettings(item, globalSettings), item.metadata),
      ),
  );
}

export interface BatchProgressSummary {
  total: number;
  /** 1-based position of the file being converted ("Converting 3 of 8"). */
  currentPosition: number;
  completed: number;
  failed: number;
  cancelled: number;
  remaining: number;
  /** 0 to 1 across the whole batch. */
  overallProgress: number;
  currentItem: QueueItem | null;
}

/**
 * Derives the batch numbers from queue state. Items added mid-run count as remaining,
 * and removed items drop out of the totals, so the numbers always match the visible queue.
 */
export function summarizeBatch(
  items: QueueItem[],
  runItemIds: string[],
  currentItemId: string | null,
): BatchProgressSummary {
  const byId = new Map(items.map((item) => [item.id, item]));
  const runItems = runItemIds.map((id) => byId.get(id)).filter((item): item is QueueItem => !!item);
  const runIds = new Set(runItemIds);

  const completed = runItems.filter((item) => item.status === 'completed').length;
  const failed = runItems.filter((item) => item.status === 'error').length;
  const cancelled = runItems.filter((item) => item.status === 'waiting').length;
  const currentItem = currentItemId ? (byId.get(currentItemId) ?? null) : null;
  const remaining = items.filter(
    (item) => item.status === 'waiting' && !runIds.has(item.id),
  ).length;

  const finished = completed + failed + cancelled;
  const total = runItems.length + remaining;
  const currentProgress = currentItem?.status === 'processing' ? currentItem.progress : 0;

  return {
    total,
    currentPosition: Math.min(total, finished + 1),
    completed,
    failed,
    cancelled,
    remaining,
    overallProgress: total > 0 ? (finished + currentProgress) / total : 0,
    currentItem,
  };
}
