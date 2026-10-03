import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { makeGifResult, makeQueueItem } from '@/tests/fixtures';

import { VideoPreviewModal } from './VideoPreviewModal';

test('shows the video, the selected section and the estimated GIF', () => {
  const item = makeQueueItem({ file: new File([], 'trailer.mp4') });
  render(
    <VideoPreviewModal
      item={item}
      globalSettings={{ ...DEFAULT_SETTINGS, section: { mode: 'range', start: 2, end: 6 } }}
      onCustomSettingsChange={() => {}}
      onClose={() => {}}
    />,
  );
  expect(screen.getByRole('dialog', { name: 'trailer.mp4' })).toBeInTheDocument();
  expect(screen.getByText('2.0 s')).toBeInTheDocument();
  expect(screen.getByText('6.0 s')).toBeInTheDocument();
  expect(screen.getByText('Estimated GIF')).toBeInTheDocument();
});

test('turning on custom settings copies the global settings to this file', () => {
  const onCustomSettingsChange = vi.fn();
  const item = makeQueueItem();
  render(
    <VideoPreviewModal
      item={item}
      globalSettings={DEFAULT_SETTINGS}
      onCustomSettingsChange={onCustomSettingsChange}
      onClose={() => {}}
    />,
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /Use custom settings/ }));
  expect(onCustomSettingsChange).toHaveBeenCalledWith(item.id, DEFAULT_SETTINGS);
});

test('shows the GIF result details after conversion', () => {
  const item = makeQueueItem({
    status: 'completed',
    result: makeGifResult({ fileName: 'clip.gif', frameCount: 75 }),
  });
  render(
    <VideoPreviewModal
      item={item}
      globalSettings={DEFAULT_SETTINGS}
      onCustomSettingsChange={() => {}}
      onClose={() => {}}
    />,
  );
  expect(screen.getByRole('region', { name: 'Converted GIF' })).toHaveTextContent('clip.gif');
  expect(screen.getByText('75')).toBeInTheDocument();
});
