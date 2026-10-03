import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { TextField } from './TextField';

test('renders a labelled input', () => {
  render(<TextField label="Email" type="email" value="" onChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
});

test('reports typed values', () => {
  const onChange = vi.fn();
  render(<TextField label="Name" value="" onChange={onChange} />);
  fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'Ada' } });
  expect(onChange).toHaveBeenCalledWith('Ada');
});

test('marks the field invalid and links the error message', () => {
  render(<TextField label="Name" value="" error="Enter your name." onChange={() => {}} />);
  const input = screen.getByRole('textbox', { name: 'Name' });
  expect(input).toBeInvalid();
  expect(input).toHaveAccessibleDescription('Enter your name.');
});

test('the small size keeps the label and value', () => {
  render(<TextField label="Width" type="number" size="sm" value="640" onChange={() => {}} />);
  expect(screen.getByRole('spinbutton', { name: 'Width' })).toHaveValue(640);
});

test('renders a textarea when multiline', () => {
  render(<TextField label="Message" value="" multiline onChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Message' }).tagName).toBe('TEXTAREA');
});
