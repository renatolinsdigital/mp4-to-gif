import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { ToastProvider } from '@/shared/components/Toast';

import { AboutPage } from './AboutPage';

test('explains the project and offers a contact form', () => {
  render(
    <ToastProvider>
      <AboutPage />
    </ToastProvider>,
  );
  expect(screen.getByRole('heading', { level: 1, name: 'About' })).toBeInTheDocument();
  expect(screen.getByText(/Videos are never uploaded/)).toBeInTheDocument();
  expect(screen.getByRole('form', { name: 'Contact form' })).toBeInTheDocument();
});
