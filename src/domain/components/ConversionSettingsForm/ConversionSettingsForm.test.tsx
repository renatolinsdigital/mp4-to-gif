import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';

import { ConversionSettingsForm } from './ConversionSettingsForm';

test('renders every setting group', () => {
  render(<ConversionSettingsForm value={DEFAULT_SETTINGS} onChange={() => {}} />);
  expect(screen.getByRole('group', { name: 'Quality' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Resolution' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Frame rate' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Fine-tune quality/ })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Loop' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Start / End' })).toBeInTheDocument();
});

test('labels the automatic frame rate with the rate the preset will use', () => {
  render(
    <ConversionSettingsForm value={{ ...DEFAULT_SETTINGS, quality: 'low' }} onChange={() => {}} />,
  );
  expect(screen.getByRole('radio', { name: 'Auto 10 FPS' })).toBeChecked();
});

test('converts option values back to typed settings', () => {
  const onChange = vi.fn();
  render(<ConversionSettingsForm value={DEFAULT_SETTINGS} onChange={onChange} />);

  fireEvent.click(screen.getByRole('radio', { name: '24 FPS' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, frameRate: 24 });

  fireEvent.click(screen.getByRole('radio', { name: /^Original/ }));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, width: 'original' });
});

test('offers Full HD as a one-tap resolution and explains the memory limit', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <ConversionSettingsForm value={DEFAULT_SETTINGS} onChange={onChange} />,
  );

  fireEvent.click(screen.getByRole('radio', { name: 'Full HD 1920 px' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, width: 1920 });

  rerender(
    <ConversionSettingsForm
      value={{ ...DEFAULT_SETTINGS, width: 1920, quality: 'ultra' }}
      onChange={onChange}
    />,
  );
  expect(screen.getByText(/Full HD: 1920 × 1080/)).toBeInTheDocument();
  expect(
    screen.getByText('At 30 FPS, 16:9 clips up to 19 s fit in browser memory at 1920 × 1080.'),
  ).toBeInTheDocument();
});

test('picking a new quality preset clears earlier fine-tuning', () => {
  const onChange = vi.fn();
  render(
    <ConversionSettingsForm
      value={{ ...DEFAULT_SETTINGS, tuning: { maxColors: 64 } }}
      onChange={onChange}
    />,
  );
  fireEvent.click(screen.getByRole('radio', { name: /^Ultra/ }));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, quality: 'ultra', tuning: {} });
});

test('validates the custom width before applying it', () => {
  const onChange = vi.fn();
  render(
    <ConversionSettingsForm value={{ ...DEFAULT_SETTINGS, width: 'custom' }} onChange={onChange} />,
  );
  const input = screen.getByLabelText(/Custom width/);

  fireEvent.change(input, { target: { value: '8' } });
  expect(onChange).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Width must be at least 16 px.');

  fireEvent.change(input, { target: { value: '600' } });
  expect(onChange).toHaveBeenLastCalledWith({
    ...DEFAULT_SETTINGS,
    width: 'custom',
    customWidth: 600,
  });
});
