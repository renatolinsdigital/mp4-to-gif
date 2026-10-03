import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { downloadUrl } from '@/shared/helpers/downloadFile';
import { makeGifResult } from '@/tests/fixtures';

import { ResultPanel } from './ResultPanel';

vi.mock('@/shared/helpers/downloadFile', () => ({ downloadUrl: vi.fn() }));

test('shows the preview, name, dimensions, frames and size', () => {
  render(
    <ResultPanel
      sourceName="my-video.mp4"
      result={makeGifResult({ fileName: 'my-video.gif', size: 2_400_000, frameCount: 90 })}
    />,
  );
  expect(screen.getByRole('img', { name: 'GIF preview of my-video.mp4' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'GIF' })).toHaveTextContent('my-video.gif');
  expect(screen.getByText('480×270')).toBeInTheDocument();
  expect(screen.getByText('90')).toBeInTheDocument();
  expect(screen.getByText('2.29 MB')).toBeInTheDocument();
});

test('downloads the GIF under its file name', () => {
  const result = makeGifResult({ url: 'blob:gif-1', fileName: 'clip.gif' });
  render(<ResultPanel sourceName="clip.mp4" result={result} />);
  fireEvent.click(screen.getByRole('button', { name: 'Download GIF' }));
  expect(downloadUrl).toHaveBeenCalledWith('blob:gif-1', 'clip.gif');
});
