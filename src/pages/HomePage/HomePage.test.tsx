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
  expect(screen.getByText(/sharp GIFs, up to Full HD/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Open the converter/ })).toHaveAttribute(
    'href',
    '/converter',
  );
  expect(screen.getByRole('heading', { name: 'How it works' })).toBeInTheDocument();
});

test('lists every quality preset, including Ultra, in the quality ladder', () => {
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
  const table = screen.getByRole('table');
  for (const label of ['Low', 'Medium', 'High', 'Very High', 'Ultra']) {
    expect(
      within(table).getByRole('rowheader', { name: new RegExp(`^${label}`) }),
    ).toBeInTheDocument();
  }
});
