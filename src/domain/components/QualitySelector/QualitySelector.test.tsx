import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { QualitySelector } from './QualitySelector';

test('renders the five presets with their size and frame rate, the current one described', () => {
  render(<QualitySelector value="medium" onChange={() => {}} />);
  for (const name of [
    'Compact 480 px · 10 FPS',
    'Standard 720 px · 10 FPS',
    'Smooth 720 px · 20 FPS',
    'HD 1280 px · 24 FPS',
    'Full HD 1920 px · 30 FPS',
  ]) {
    expect(screen.getByRole('radio', { name })).toBeInTheDocument();
  }
  expect(screen.getByRole('radio', { name: /^Standard/ })).toBeChecked();
  expect(screen.getByText(/^The default\./)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Reset/ })).not.toBeInTheDocument();
});

test('reports the selected preset', () => {
  const onChange = vi.fn();
  render(<QualitySelector value="medium" onChange={onChange} />);
  fireEvent.click(screen.getByRole('radio', { name: /^Full HD/ }));
  expect(onChange).toHaveBeenCalledWith('ultra');
});

test('offers to reset a preset whose settings were changed', () => {
  const onChange = vi.fn();
  render(<QualitySelector value="medium" adjusted onChange={onChange} />);
  expect(screen.getByText(/You changed some settings below/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reset to Standard' }));
  expect(onChange).toHaveBeenCalledWith('medium');
});
