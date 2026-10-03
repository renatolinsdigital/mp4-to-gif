import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { makeQueueItem } from '@/tests/fixtures';

import { FileQueue } from './FileQueue';

const noop = () => {};

test('lists every item and summarizes problems', () => {
  const items = [
    makeQueueItem(),
    makeQueueItem({ status: 'error', error: { code: 'corrupted', message: 'Broken.' } }),
  ];
  render(
    <FileQueue
      items={items}
      settings={DEFAULT_SETTINGS}
      onPreview={noop}
      onRemove={noop}
      onRequeue={noop}
      onClearAll={noop}
    />,
  );
  const region = screen.getByRole('region', { name: 'Files' });
  expect(within(region).getAllByRole('listitem')).toHaveLength(2);
  expect(region).toHaveTextContent('2 files, 1 with problems');
});

test('clears the whole queue', () => {
  const onClearAll = vi.fn();
  render(
    <FileQueue
      items={[makeQueueItem()]}
      settings={DEFAULT_SETTINGS}
      onPreview={noop}
      onRemove={noop}
      onRequeue={noop}
      onClearAll={onClearAll}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Clear all' }));
  expect(onClearAll).toHaveBeenCalledTimes(1);
});
