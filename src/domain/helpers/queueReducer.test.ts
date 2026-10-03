import { describe, expect, test } from 'vitest';

import { makeGifResult, makeQueueItem } from '@/tests/fixtures';

import { initialQueueState, queueReducer, type QueueState } from './queueReducer';

function stateWith(...items: ReturnType<typeof makeQueueItem>[]): QueueState {
  return { ...initialQueueState, items };
}

const resultWithoutName = () => {
  const result: Partial<ReturnType<typeof makeGifResult>> = makeGifResult();
  delete result.fileName;
  return result as Omit<ReturnType<typeof makeGifResult>, 'fileName'>;
};

describe('conversionCompleted', () => {
  test('names the GIF after the source file', () => {
    const item = makeQueueItem({ status: 'processing', file: new File([], 'my-video.mp4') });
    const next = queueReducer(stateWith(item), {
      type: 'conversionCompleted',
      id: item.id,
      result: resultWithoutName(),
    });
    expect(next.items[0]?.status).toBe('completed');
    expect(next.items[0]?.result?.fileName).toBe('my-video.gif');
  });

  test('avoids duplicate names across results', () => {
    const done = makeQueueItem({
      status: 'completed',
      file: new File([], 'my-video.mp4'),
      result: makeGifResult({ fileName: 'my-video.gif' }),
    });
    const current = makeQueueItem({ status: 'processing', file: new File([], 'my-video.mp4') });
    const next = queueReducer(stateWith(done, current), {
      type: 'conversionCompleted',
      id: current.id,
      result: resultWithoutName(),
    });
    expect(next.items[1]?.result?.fileName).toBe('my-video-2.gif');
  });
});

test('an error affects only its own item', () => {
  const failing = makeQueueItem({ status: 'processing' });
  const other = makeQueueItem();
  const next = queueReducer(stateWith(failing, other), {
    type: 'itemFailed',
    id: failing.id,
    error: { code: 'corrupted', message: 'Broken.' },
  });
  expect(next.items[0]?.status).toBe('error');
  expect(next.items[1]).toBe(other);
});

test('cancelling puts the item back in the queue and remembers why', () => {
  const item = makeQueueItem({ status: 'processing', progress: 0.4 });
  const next = queueReducer(stateWith(item), { type: 'conversionCancelled', id: item.id });
  expect(next.items[0]).toMatchObject({ status: 'waiting', progress: 0, wasCancelled: true });
});

test('requeue resets errors but not unreadable files', () => {
  const failed = makeQueueItem({ status: 'error', error: { code: 'conversion-failed', message: 'x' } });
  const unreadable = makeQueueItem({ status: 'error', metadata: null });
  let next = queueReducer(stateWith(failed, unreadable), { type: 'itemRequeued', id: failed.id });
  next = queueReducer(next, { type: 'itemRequeued', id: unreadable.id });
  expect(next.items[0]).toMatchObject({ status: 'waiting', error: null });
  expect(next.items[1]?.status).toBe('error');
});

test('clearing completed keeps everything else', () => {
  const done = makeQueueItem({ status: 'completed', result: makeGifResult() });
  const waiting = makeQueueItem();
  const next = queueReducer(stateWith(done, waiting), { type: 'completedCleared' });
  expect(next.items).toEqual([waiting]);
});

test('progress updates are ignored once an item is no longer processing', () => {
  const item = makeQueueItem({ status: 'completed', progress: 1 });
  const state = stateWith(item);
  expect(queueReducer(state, { type: 'conversionProgressed', id: item.id, progress: 0.3 }).items[0]).toBe(
    item,
  );
});

test('actions for removed items are ignored', () => {
  const state = stateWith(makeQueueItem());
  expect(queueReducer(state, { type: 'conversionStarted', id: 'gone' })).toBe(state);
});
