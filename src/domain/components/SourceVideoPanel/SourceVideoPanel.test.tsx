import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { makeJob } from '@/tests/fixtures';

import { SourceVideoPanel } from './SourceVideoPanel';

const baseProps = { onRemove: () => {}, onTimeChange: () => {} };

test('shows the video and its facts', () => {
  render(<SourceVideoPanel {...baseProps} job={makeJob({ file: new File([], 'trailer.mp4') })} />);
  expect(screen.getByRole('region', { name: 'Video' })).toHaveTextContent('trailer.mp4');
  expect(screen.getByLabelText('Preview of trailer.mp4')).toBeInTheDocument();
  expect(screen.getByText('1920×1080')).toBeInTheDocument();
});

test('shows a reading state while the video is analyzed', () => {
  render(
    <SourceVideoPanel {...baseProps} job={makeJob({ status: 'analyzing', metadata: null })} />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('Reading the video…');
});

test('explains why a file could not be read', () => {
  render(
    <SourceVideoPanel
      {...baseProps}
      job={makeJob({
        status: 'error',
        metadata: null,
        error: { code: 'corrupted', message: 'This file looks damaged.' },
      })}
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('This file looks damaged.');
});

test('Remove calls onRemove', () => {
  const onRemove = vi.fn();
  render(<SourceVideoPanel {...baseProps} job={makeJob()} onRemove={onRemove} />);
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(onRemove).toHaveBeenCalledTimes(1);
});
