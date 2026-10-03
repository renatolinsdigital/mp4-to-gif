import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { makeGifResult } from '@/tests/fixtures';

import { ResultCard } from './ResultCard';

test('shows the preview, names, dimensions, frames and size', () => {
  render(
    <ul>
      <ResultCard
        sourceName="my-video.mp4"
        result={makeGifResult({ fileName: 'my-video.gif', size: 2_400_000, frameCount: 90 })}
        onDownload={() => {}}
        onRemove={() => {}}
      />
    </ul>,
  );
  expect(screen.getByRole('img', { name: 'GIF preview of my-video.mp4' })).toBeInTheDocument();
  expect(screen.getByText('my-video.gif')).toBeInTheDocument();
  expect(screen.getByText('from my-video.mp4')).toBeInTheDocument();
  expect(screen.getByText('480×270')).toBeInTheDocument();
  expect(screen.getByText('90')).toBeInTheDocument();
  expect(screen.getByText('2.29 MB')).toBeInTheDocument();
});

test('downloads and removes the result', () => {
  const onDownload = vi.fn();
  const onRemove = vi.fn();
  render(
    <ul>
      <ResultCard
        sourceName="clip.mp4"
        result={makeGifResult({ fileName: 'clip.gif' })}
        onDownload={onDownload}
        onRemove={onRemove}
      />
    </ul>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Download' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove clip.gif' }));
  expect(onDownload).toHaveBeenCalledTimes(1);
  expect(onRemove).toHaveBeenCalledTimes(1);
});
