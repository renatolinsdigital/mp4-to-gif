import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { SearchField } from './SearchField';

test('renders a labelled search box with its shortcut hint', () => {
  render(<SearchField label="Search the docs" value="" shortcut="/" onChange={() => {}} />);
  expect(screen.getByRole('searchbox', { name: 'Search the docs' })).toBeInTheDocument();
  expect(screen.getByText('/')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
});

test('reports typed values', () => {
  const onChange = vi.fn();
  render(<SearchField label="Search" value="" onChange={onChange} />);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'dither' } });
  expect(onChange).toHaveBeenCalledWith('dither');
});

test('clears with the button and with Escape', () => {
  const onChange = vi.fn();
  render(<SearchField label="Search" value="fps" onChange={onChange} />);
  fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
  fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
  expect(onChange).toHaveBeenNthCalledWith(1, '');
  expect(onChange).toHaveBeenNthCalledWith(2, '');
});
