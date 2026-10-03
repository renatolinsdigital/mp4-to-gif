import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { SelectField } from './SelectField';

const options = [
  { value: 'auto', label: 'Automatic' },
  { value: '15', label: '15 FPS' },
];

test('renders a labelled select with its hint', () => {
  render(
    <SelectField label="Frame rate" value="auto" options={options} hint="Higher is smoother" onChange={() => {}} />,
  );
  const select = screen.getByRole('combobox', { name: 'Frame rate' });
  expect(select).toHaveValue('auto');
  expect(select).toHaveAccessibleDescription('Higher is smoother');
});

test('reports the chosen value', () => {
  const onChange = vi.fn();
  render(<SelectField label="Frame rate" value="auto" options={options} onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '15' } });
  expect(onChange).toHaveBeenCalledWith('15');
});
