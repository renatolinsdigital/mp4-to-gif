import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { DEFAULT_SETTINGS, SPEED_STEPS } from '@/domain/helpers/settingsSchema';

import { ConversionSettingsForm } from './ConversionSettingsForm';

test('renders every setting group', () => {
  render(<ConversionSettingsForm value={DEFAULT_SETTINGS} onChange={() => {}} />);
  expect(screen.getByRole('group', { name: 'Preset' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Resolution' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Frame rate' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Fine-tune quality/ })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Loop' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: 'Start / End' })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'Speed' })).toBeInTheDocument();
});

test('changes the speed and describes the GIF length for the chosen section', () => {
  const onChange = vi.fn();
  render(
    <ConversionSettingsForm
      value={{ ...DEFAULT_SETTINGS, speed: 2, section: { mode: 'range', start: 10, end: 70 } }}
      duration={120}
      onChange={onChange}
    />,
  );
  const slider = screen.getByRole('slider', { name: 'Speed' });
  expect(slider).toHaveAccessibleDescription('60.0 s of video becomes a 30.0 s GIF.');

  fireEvent.change(slider, { target: { value: String(SPEED_STEPS.indexOf(0.5)) } });
  expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ speed: 0.5 }));
});

test('labels the automatic frame rate with the rate the preset will use', () => {
  render(
    <ConversionSettingsForm
      value={{ ...DEFAULT_SETTINGS, quality: 'low', frameRate: 'auto' }}
      onChange={() => {}}
    />,
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
      value={{ ...DEFAULT_SETTINGS, width: 1920, quality: 'ultra', frameRate: 'auto' }}
      onChange={onChange}
    />,
  );
  expect(screen.getByText(/Full HD: 1920 × 1080/)).toBeInTheDocument();
  expect(
    screen.getByText('At 30 FPS, 16:9 clips up to 19 s fit in browser memory at 1920 × 1080.'),
  ).toBeInTheDocument();
});

test('the default settings match the Standard preset exactly', () => {
  render(<ConversionSettingsForm value={DEFAULT_SETTINGS} onChange={() => {}} />);
  expect(screen.getByRole('radio', { name: 'Standard 720 px · 10 FPS' })).toBeChecked();
  expect(screen.queryByRole('button', { name: /^Reset to/ })).not.toBeInTheDocument();
});

test('picking a preset sets its size and frame rate and clears earlier fine-tuning', () => {
  const onChange = vi.fn();
  render(
    <ConversionSettingsForm
      value={{ ...DEFAULT_SETTINGS, tuning: { maxColors: 64 } }}
      onChange={onChange}
    />,
  );
  const presets = screen.getByRole('group', { name: 'Preset' });
  fireEvent.click(within(presets).getByRole('radio', { name: /^Full HD/ }));
  expect(onChange).toHaveBeenLastCalledWith({
    ...DEFAULT_SETTINGS,
    quality: 'ultra',
    width: 1920,
    frameRate: 30,
    tuning: {},
  });
});

test('resets a preset after its size was changed', () => {
  const onChange = vi.fn();
  render(
    <ConversionSettingsForm value={{ ...DEFAULT_SETTINGS, width: 1920 }} onChange={onChange} />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset to Standard' }));
  expect(onChange).toHaveBeenLastCalledWith(DEFAULT_SETTINGS);
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

test('validates the custom frame rate before applying it', () => {
  const onChange = vi.fn();
  const { rerender } = render(
    <ConversionSettingsForm value={DEFAULT_SETTINGS} onChange={onChange} />,
  );
  expect(screen.queryByLabelText(/Custom frame rate/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('radio', { name: 'Custom 1–30' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, frameRate: 'custom' });

  rerender(
    <ConversionSettingsForm
      value={{ ...DEFAULT_SETTINGS, frameRate: 'custom' }}
      onChange={onChange}
    />,
  );
  const input = screen.getByLabelText(/Custom frame rate/);

  fireEvent.change(input, { target: { value: '31' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Frame rate can be at most 30 FPS.');

  fireEvent.change(input, { target: { value: '0' } });
  expect(screen.getByRole('alert')).toHaveTextContent('Frame rate must be at least 1 FPS.');

  fireEvent.change(input, { target: { value: '5' } });
  expect(onChange).toHaveBeenLastCalledWith({
    ...DEFAULT_SETTINGS,
    frameRate: 'custom',
    customFrameRate: 5,
  });
});
