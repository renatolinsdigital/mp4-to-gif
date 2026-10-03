import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { createZipArchive } from '@/domain/services/archive.service';
import { ToastProvider } from '@/shared/components/Toast';
import { downloadBlob, downloadUrl } from '@/shared/helpers/downloadFile';
import { makeGifResult, makeQueueItem } from '@/tests/fixtures';

import { ResultsPanel } from './ResultsPanel';

vi.mock('@/shared/helpers/downloadFile', () => ({ downloadUrl: vi.fn(), downloadBlob: vi.fn() }));
vi.mock('@/domain/services/archive.service', () => ({
  createZipArchive: vi.fn(async () => new Blob(['zip'])),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function completed(fileName: string) {
  return makeQueueItem({
    status: 'completed',
    result: makeGifResult({ fileName, url: `blob:${fileName}` }),
  });
}

function renderPanel(items = [completed('a.gif'), completed('b.gif')], handlers = {}) {
  render(
    <ToastProvider>
      <ResultsPanel items={items} onRemove={() => {}} onClearCompleted={() => {}} {...handlers} />
    </ToastProvider>,
  );
}

test('renders one card per result with a summary', () => {
  renderPanel();
  expect(screen.getByRole('region', { name: 'Results' })).toHaveTextContent('2 GIFs');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});

test('downloads a single result directly', () => {
  renderPanel([completed('only.gif')]);
  fireEvent.click(screen.getByRole('button', { name: 'Download All' }));
  expect(downloadUrl).toHaveBeenCalledWith('blob:only.gif', 'only.gif');
  expect(createZipArchive).not.toHaveBeenCalled();
});

test('packages several results into one ZIP', async () => {
  renderPanel();
  fireEvent.click(screen.getByRole('button', { name: 'Download All (2) as ZIP' }));

  await waitFor(() => expect(downloadBlob).toHaveBeenCalledTimes(1));
  const entries = vi.mocked(createZipArchive).mock.calls[0]?.[0] ?? [];
  expect(entries.map((entry) => entry.name)).toEqual(['a.gif', 'b.gif']);
  expect(vi.mocked(downloadBlob).mock.calls[0]?.[1]).toMatch(/^gifs-\d{8}-\d{4}\.zip$/);
});

test('clears completed results', () => {
  const onClearCompleted = vi.fn();
  renderPanel(undefined, { onClearCompleted });
  fireEvent.click(screen.getByRole('button', { name: 'Clear completed' }));
  expect(onClearCompleted).toHaveBeenCalledTimes(1);
});
