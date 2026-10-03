import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';

import { ToastProvider } from '@/shared/components/Toast';

import { DonatePage } from './DonatePage';

test('explains why to donate and offers the PayPal donation card', () => {
  render(
    <MemoryRouter>
      <ToastProvider>
        <DonatePage />
      </ToastProvider>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Keep it free' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Make a donation' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^Donate \$5 with PayPal/ })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Where it goes' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open the converter' })).toHaveAttribute(
    'href',
    '/converter',
  );
});
