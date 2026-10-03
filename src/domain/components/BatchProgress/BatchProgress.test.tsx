import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { summarizeBatch } from '@/domain/helpers/queueSelectors';
import { makeQueueItem } from '@/tests/fixtures';

import { BatchProgress } from './BatchProgress';

function buildSummary() {
  const done = [makeQueueItem({ status: 'completed' }), makeQueueItem({ status: 'completed' })];
  const current = makeQueueItem({
    status: 'processing',
    progress: 0.91,
    file: new File([], 'my-gameplay.mp4'),
  });
  const remaining = Array.from({ length: 5 }, () => makeQueueItem());
  const items = [...done, current, ...remaining];
  return summarizeBatch(items, [...done, current].map((item) => item.id), current.id);
}

test('shows the batch position, current file and counts', () => {
  render(<BatchProgress summary={buildSummary()} onCancelCurrent={() => {}} onCancelAll={() => {}} />);

  expect(screen.getByText('Converting 3 of 8')).toBeInTheDocument();
  expect(screen.getByText('my-gameplay.mp4')).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Current file progress' })).toHaveAttribute(
    'aria-valuenow',
    '91',
  );
  expect(screen.getByText('Completed').nextSibling).toHaveTextContent('2');
  expect(screen.getByText('Remaining').nextSibling).toHaveTextContent('5');
});

test('cancels the current file or the whole queue', () => {
  const onCancelCurrent = vi.fn();
  const onCancelAll = vi.fn();
  render(
    <BatchProgress summary={buildSummary()} onCancelCurrent={onCancelCurrent} onCancelAll={onCancelAll} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Cancel current file' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel all' }));
  expect(onCancelCurrent).toHaveBeenCalledTimes(1);
  expect(onCancelAll).toHaveBeenCalledTimes(1);
});
