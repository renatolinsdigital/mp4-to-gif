import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { makeJob } from '@/tests/fixtures';

import { SourceVideoPanel } from './SourceVideoPanel';

const baseProps = { settings: DEFAULT_SETTINGS, onRemove: () => {}, onTimeChange: () => {} };

test('shows the video, its facts and the section to convert', () => {
  render(
    <SourceVideoPanel
      {...baseProps}
      job={makeJob({ file: new File([], 'trailer.mp4') })}
      settings={{ ...DEFAULT_SETTINGS, section: { mode: 'range', start: 2, end: 6 } }}
    />,
  );
  expect(screen.getByRole('region', { name: 'Video' })).toHaveTextContent('trailer.mp4');
  expect(screen.getByLabelText('Preview of trailer.mp4')).toBeInTheDocument();
  expect(screen.getByText('1920×1080')).toBeInTheDocument();
  expect(screen.getByText('2.0 s')).toBeInTheDocument();
  expect(screen.getByText('6.0 s')).toBeInTheDocument();
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
