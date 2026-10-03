import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { Badge } from './Badge';

test('renders its text with the tone class', () => {
  render(<Badge tone="success">Completed</Badge>);
  const badge = screen.getByText('Completed');
  expect(badge.className).toMatch(/success/);
});
