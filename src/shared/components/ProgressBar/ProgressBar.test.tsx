import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { ProgressBar } from './ProgressBar';

test('exposes the value as a percentage to assistive technology', () => {
  render(<ProgressBar value={0.684} label="Overall progress" showValue />);
  const bar = screen.getByRole('progressbar', { name: 'Overall progress' });
  expect(bar).toHaveAttribute('aria-valuenow', '68');
  expect(screen.getByText('68%')).toBeInTheDocument();
});

test('clamps out-of-range values', () => {
  render(<ProgressBar value={1.7} label="File progress" />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
});
