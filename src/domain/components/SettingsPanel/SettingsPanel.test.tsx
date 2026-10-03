import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import { makeJob } from '@/tests/fixtures';

import { SettingsPanel } from './SettingsPanel';

const baseProps = {
  settings: DEFAULT_SETTINGS,
  onSettingsChange: () => {},
  currentTime: 0,
  onConvert: () => {},
  onCancel: () => {},
};

test('shows the settings, the estimate and the Convert button', () => {
  const onConvert = vi.fn();
  render(<SettingsPanel {...baseProps} job={makeJob()} onConvert={onConvert} />);
  expect(screen.getByRole('group', { name: 'Preset' })).toBeInTheDocument();
  expect(screen.getByText('Estimated GIF')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Convert to GIF' }));
  expect(onConvert).toHaveBeenCalledTimes(1);
});

test('waits for the video to be read before converting', () => {
  render(<SettingsPanel {...baseProps} job={makeJob({ status: 'analyzing', metadata: null })} />);
  expect(screen.getByRole('button', { name: 'Convert to GIF' })).toBeDisabled();
});

test('shows progress and a Cancel button while converting', () => {
  const onCancel = vi.fn();
  render(
    <SettingsPanel
      {...baseProps}
      job={makeJob({ status: 'processing', progress: 0.5 })}
      onCancel={onCancel}
    />,
  );
  expect(screen.getByRole('progressbar', { name: 'Conversion progress' })).toHaveAttribute(
    'aria-valuenow',
    '50',
  );
  expect(screen.getByRole('radio', { name: /Infinite/ })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test('blocks a conversion that would not fit in browser memory', () => {
  render(
    <SettingsPanel
      {...baseProps}
      job={makeJob({ metadata: { duration: 600, width: 1920, height: 1080 } })}
      settings={{ ...DEFAULT_SETTINGS, width: 'original', frameRate: 30 }}
    />,
  );
  expect(screen.getByText(/Too long for this size in browser memory/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Convert to GIF' })).toBeDisabled();
});

test('shows why the last conversion failed', () => {
  render(
    <SettingsPanel
      {...baseProps}
      job={makeJob({
        status: 'error',
        error: { code: 'insufficient-memory', message: 'Ran out of memory.' },
      })}
    />,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Ran out of memory.');
});
