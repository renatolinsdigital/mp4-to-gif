import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { Slider } from './Slider';

test('renders a labelled slider showing its readable value', () => {
  render(<Slider label="Speed" value={3} min={0} max={8} valueText="2×" onChange={() => {}} />);
  const slider = screen.getByRole('slider', { name: 'Speed' });
  expect(slider).toHaveValue('3');
  expect(slider).toHaveAttribute('aria-valuetext', '2×');
  expect(screen.getByRole('status')).toHaveTextContent('2×');
});

test('reports the new value as a number', () => {
  const onChange = vi.fn();
  render(<Slider label="Speed" value={3} min={0} max={8} onChange={onChange} />);
  fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '6' } });
  expect(onChange).toHaveBeenCalledWith(6);
});

test('links the hint as the slider description', () => {
  render(
    <Slider label="Speed" value={1} min={0} max={2} hint="Twice as fast." onChange={() => {}} />,
  );
  expect(screen.getByRole('slider', { name: 'Speed' })).toHaveAccessibleDescription(
    'Twice as fast.',
  );
});

test('can be disabled', () => {
  render(<Slider label="Speed" value={1} min={0} max={2} disabled onChange={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Speed' })).toBeDisabled();
});
