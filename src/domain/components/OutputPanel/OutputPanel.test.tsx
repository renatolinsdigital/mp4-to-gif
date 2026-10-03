import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';

import { OutputPanel } from './OutputPanel';

const baseProps = {
  settings: DEFAULT_SETTINGS,
  onSettingsChange: () => {},
  customSettingsCount: 0,
  estimatedSize: null,
  isRunning: false,
  onConvertAll: () => {},
};

test('disables conversion until at least one valid file is waiting', () => {
  render(<OutputPanel {...baseProps} waitingCount={0} />);
  expect(screen.getByRole('button', { name: 'Convert All' })).toBeDisabled();
  expect(screen.getByText(/Add at least one valid MP4/)).toBeInTheDocument();
});

test('starts the batch and shows the size estimate', () => {
  const onConvertAll = vi.fn();
  render(
    <OutputPanel
      {...baseProps}
      waitingCount={3}
      estimatedSize={3 * 1024 ** 2}
      onConvertAll={onConvertAll}
    />,
  );
  expect(screen.getByText('about 3.00 MB')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Convert All (3)' }));
  expect(onConvertAll).toHaveBeenCalledTimes(1);
});

test('warns when some waiting files are too large for memory', () => {
  render(
    <OutputPanel {...baseProps} waitingCount={3} oversizedCount={1} estimatedSize={1024 ** 2} />,
  );
  expect(screen.getByText(/Estimated output for 2 files/)).toBeInTheDocument();
  expect(screen.getByText(/1 file is too large for browser memory/)).toBeInTheDocument();
});

test('mentions files with their own settings', () => {
  render(<OutputPanel {...baseProps} waitingCount={2} customSettingsCount={1} />);
  expect(screen.getByText(/except 1 file with custom settings/)).toBeInTheDocument();
});
