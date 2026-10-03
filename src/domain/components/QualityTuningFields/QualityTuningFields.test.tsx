import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { QualityTuningFields } from './QualityTuningFields';

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /Fine-tune quality/ }));
}

test('starts collapsed and expands to show the preset values', () => {
  render(<QualityTuningFields quality="ultra" value={{}} onChange={() => {}} />);
  const toggle = screen.getByRole('button', { name: /Fine-tune quality/ });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('group', { name: 'Dithering' })).not.toBeInTheDocument();

  openPanel();

  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('radio', { name: /^Diffusion/ })).toBeChecked();
  expect(screen.getByRole('radio', { name: /^256/ })).toBeChecked();
});

test('records a change that differs from the preset', () => {
  const onChange = vi.fn();
  render(<QualityTuningFields quality="ultra" value={{}} onChange={onChange} />);
  openPanel();
  fireEvent.click(screen.getByRole('radio', { name: /^Ordered/ }));
  expect(onChange).toHaveBeenCalledWith({ dither: 'ordered' });
});

test('choosing the preset value again drops the override', () => {
  const onChange = vi.fn();
  render(<QualityTuningFields quality="ultra" value={{ dither: 'off' }} onChange={onChange} />);
  openPanel();
  fireEvent.click(screen.getByRole('radio', { name: /^Diffusion/ }));
  expect(onChange).toHaveBeenCalledWith({});
});

test('shows when settings are tuned and resets them', () => {
  const onChange = vi.fn();
  render(<QualityTuningFields quality="high" value={{ maxColors: 64 }} onChange={onChange} />);
  expect(screen.getByText('Tuned from Smooth')).toBeInTheDocument();
  openPanel();
  fireEvent.click(screen.getByRole('button', { name: /Reset fine-tuning/ }));
  expect(onChange).toHaveBeenCalledWith({});
});

test('shows the preset lossy compression level and lets it be turned off', () => {
  const onChange = vi.fn();
  render(<QualityTuningFields quality="ultra" value={{}} onChange={onChange} />);
  openPanel();
  const lossy = within(screen.getByRole('group', { name: 'Lossy compression' }));
  expect(lossy.getByRole('radio', { name: /^Light/ })).toBeChecked();
  fireEvent.click(lossy.getByRole('radio', { name: /^Off/ }));
  expect(onChange).toHaveBeenCalledWith({ lossy: 'off' });
});
