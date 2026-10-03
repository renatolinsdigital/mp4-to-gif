import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

const options = [
  { value: 'infinite', label: 'Infinite' },
  { value: 'once', label: 'Once' },
] as const;

test('renders a labelled radio group with the current value checked', () => {
  render(<SegmentedControl legend="Loop" options={options} value="infinite" onChange={() => {}} />);
  expect(screen.getByRole('group', { name: 'Loop' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'Infinite' })).toBeChecked();
});

test('reports the selected value', () => {
  const onChange = vi.fn();
  render(<SegmentedControl legend="Loop" options={options} value="infinite" onChange={onChange} />);
  fireEvent.click(screen.getByRole('radio', { name: 'Once' }));
  expect(onChange).toHaveBeenCalledWith('once');
});

test('includes an option hint in its accessible name', () => {
  render(
    <SegmentedControl
      legend="Resolution"
      options={[{ value: '1920', label: 'Full HD', hint: '1920 px' }]}
      value="1920"
      onChange={() => {}}
    />,
  );
  expect(screen.getByRole('radio', { name: 'Full HD 1920 px' })).toBeChecked();
});
