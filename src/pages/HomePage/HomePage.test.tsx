import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';

import { HomePage } from './HomePage';

test('explains the product and links to the converter', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'MP4 to GIF' })).toBeInTheDocument();
  expect(screen.getByText(/sharp, optimized GIFs, up to Full HD/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open the converter/ })).toHaveAttribute(
    'href',
    '/converter',
  );
  expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
});

test('lists every preset and marks Standard as the default', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  const table = screen.getByRole('table');
  for (const label of ['Compact', 'Standard', 'Smooth', 'HD', 'Full HD']) {
    expect(
      within(table).getByRole('rowheader', { name: new RegExp(`^${label}`) }),
    ).toBeInTheDocument();
  }
  expect(within(table).getByRole('rowheader', { name: 'Standard Default' })).toBeInTheDocument();
});
