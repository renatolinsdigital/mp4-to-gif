import { expect, test } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { makeQueueItem } from '@/tests/fixtures';

import { estimateQueueOutputSize, oversizedItems, summarizeBatch } from './queueSelectors';

test('summarizes the batch like "Converting 3 of 8"', () => {
  const done = [makeQueueItem({ status: 'completed' }), makeQueueItem({ status: 'error' })];
  const current = makeQueueItem({ status: 'processing', progress: 0.5 });
  const later = Array.from({ length: 5 }, () => makeQueueItem());
  const items = [...done, current, ...later];

  const summary = summarizeBatch(
    items,
    [...done, current].map((item) => item.id),
    current.id,
  );

  expect(summary).toMatchObject({
    total: 8,
    currentPosition: 3,
    completed: 1,
    failed: 1,
    remaining: 5,
    currentItem: current,
  });
  expect(summary.overallProgress).toBeCloseTo(2.5 / 8);
});

test('files added mid-run count as remaining', () => {
  const current = makeQueueItem({ status: 'processing' });
  const added = makeQueueItem();
  const summary = summarizeBatch([current, added], [current.id], current.id);
  expect(summary.total).toBe(2);
  expect(summary.remaining).toBe(1);
});

test('estimates output only for waiting files, honoring per-file settings', () => {
  const waiting = makeQueueItem();
  const custom = makeQueueItem({ customSettings: { ...DEFAULT_SETTINGS, quality: 'veryHigh' } });
  const done = makeQueueItem({ status: 'completed' });

  const both = estimateQueueOutputSize([waiting, custom, done], DEFAULT_SETTINGS) ?? 0;
  const single = estimateQueueOutputSize([waiting], DEFAULT_SETTINGS) ?? 0;

  expect(single).toBeGreaterThan(0);
  expect(both).toBeGreaterThan(single * 2);
  expect(estimateQueueOutputSize([done], DEFAULT_SETTINGS)).toBeNull();
});

test('flags waiting files that are too long for Full HD and leaves them out of the estimate', () => {
  const fullHdUltra = { ...DEFAULT_SETTINGS, quality: 'ultra' as const, width: 1920 as const };
  const short = makeQueueItem({ metadata: { duration: 10, width: 1920, height: 1080 } });
  const long = makeQueueItem({ metadata: { duration: 60, width: 1920, height: 1080 } });

  expect(oversizedItems([short, long], fullHdUltra)).toEqual([long]);
  expect(estimateQueueOutputSize([short, long], fullHdUltra)).toBe(
    estimateQueueOutputSize([short], fullHdUltra),
  );
});
