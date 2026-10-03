import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { makeGifResult, makeQueueItem } from '@/tests/fixtures';

import { QueueItemRow } from './QueueItemRow';

const handlers = { onPreview: vi.fn(), onRemove: vi.fn(), onRequeue: vi.fn() };

function renderRow(item = makeQueueItem()) {
  render(
    <ul>
      <QueueItemRow item={item} settings={DEFAULT_SETTINGS} {...handlers} />
    </ul>,
  );
  return item;
}

test('shows the file name, duration, resolution, size and status', () => {
  renderRow(makeQueueItem({ file: new File([new Uint8Array(2048)], 'gameplay.mp4') }));
  expect(screen.getByText('gameplay.mp4')).toBeInTheDocument();
  expect(screen.getByText('0:12')).toBeInTheDocument();
  expect(screen.getByText('1920×1080')).toBeInTheDocument();
  expect(screen.getByText('2.00 KB')).toBeInTheDocument();
  expect(screen.getByText('Waiting')).toBeInTheDocument();
});

test('preview and remove act on this item', () => {
  const item = renderRow();
  fireEvent.click(screen.getByRole('button', { name: `Preview ${item.file.name}` }));
  fireEvent.click(screen.getByRole('button', { name: `Remove ${item.file.name}` }));
  expect(handlers.onPreview).toHaveBeenCalledWith(item.id);
  expect(handlers.onRemove).toHaveBeenCalledWith(item.id);
});

test('shows progress while processing', () => {
  const item = renderRow(makeQueueItem({ status: 'processing', progress: 0.91 }));
  expect(screen.getByRole('progressbar', { name: `Converting ${item.file.name}` })).toHaveAttribute(
    'aria-valuenow',
    '91',
  );
});

test('explains errors in text and offers a retry', () => {
  const item = renderRow(
    makeQueueItem({
      status: 'error',
      error: { code: 'corrupted', message: 'The video looks corrupted.' },
    }),
  );
  expect(screen.getByText('The video looks corrupted.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: `Retry ${item.file.name}` }));
  expect(handlers.onRequeue).toHaveBeenCalledWith(item.id);
});

test('does not offer retry or preview for files that could not be read', () => {
  const item = renderRow(
    makeQueueItem({
      status: 'error',
      metadata: null,
      error: { code: 'invalid-mp4', message: "This file isn't a valid MP4 video." },
    }),
  );
  expect(screen.queryByRole('button', { name: `Retry ${item.file.name}` })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: `Preview ${item.file.name}` })).toBeDisabled();
});

test('shows the generated GIF name once completed', () => {
  renderRow(
    makeQueueItem({ status: 'completed', result: makeGifResult({ fileName: 'clip-2.gif' }) }),
  );
  expect(screen.getByText(/clip-2\.gif/)).toBeInTheDocument();
});

test('warns before converting when the GIF would not fit in memory', () => {
  const item = makeQueueItem({ metadata: { duration: 120, width: 1920, height: 1080 } });
  render(
    <ul>
      <QueueItemRow
        item={item}
        settings={{ ...DEFAULT_SETTINGS, quality: 'ultra', frameRate: 'auto', width: 1920 }}
        {...handlers}
      />
    </ul>,
  );
  expect(screen.getByText('Too large')).toBeInTheDocument();
  expect(screen.getByText(/Trim it to 19 s/)).toBeInTheDocument();
});
