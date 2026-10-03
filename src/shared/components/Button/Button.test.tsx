import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { Button } from './Button';

test('renders the label', () => {
  render(<Button label="Convert All" onClick={() => {}} />);
  expect(screen.getByRole('button', { name: 'Convert All' })).toBeInTheDocument();
});

test('calls onClick when clicked', () => {
  const onClick = vi.fn();
  render(<Button label="Convert All" onClick={onClick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Convert All' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('uses the label as the accessible name when icon-only', () => {
  render(<Button label="Remove clip.mp4" icon="trash" iconOnly onClick={() => {}} />);
  const button = screen.getByRole('button', { name: 'Remove clip.mp4' });
  expect(button).not.toHaveTextContent('Remove clip.mp4');
});

test('does not fire onClick while disabled or loading', () => {
  const onClick = vi.fn();
  const { rerender } = render(<Button label="Save" disabled onClick={onClick} />);
  fireEvent.click(screen.getByRole('button'));
  rerender(<Button label="Save" loading onClick={onClick} />);
  fireEvent.click(screen.getByRole('button'));
  expect(onClick).not.toHaveBeenCalled();
});
