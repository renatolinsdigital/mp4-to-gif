import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { QualitySelector } from './QualitySelector';

test('renders the five presets with the current one selected and described', () => {
  render(<QualitySelector value="medium" onChange={() => {}} />);
  for (const label of ['Low', 'Medium', 'High', 'Very High', 'Ultra']) {
    expect(screen.getByRole('radio', { name: new RegExp(`^${label}\\b`) })).toBeInTheDocument();
  }
  expect(screen.getByRole('radio', { name: /^Medium/ })).toBeChecked();
  expect(screen.getByText(/Balanced quality and size/)).toBeInTheDocument();
});

test('reports the selected preset', () => {
  const onChange = vi.fn();
  render(<QualitySelector value="medium" onChange={onChange} />);
  fireEvent.click(screen.getByRole('radio', { name: /^Ultra/ }));
  expect(onChange).toHaveBeenCalledWith('ultra');
});
