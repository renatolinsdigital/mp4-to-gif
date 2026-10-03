import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';

import { RouteErrorPage } from './RouteErrorPage';

afterEach(() => {
  vi.restoreAllMocks();
});

function renderFailingRoute(error: Error) {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Broken = () => {
    throw error;
  };
  const router = createMemoryRouter([
    { path: '/', element: <Broken />, errorElement: <RouteErrorPage /> },
  ]);
  render(<RouterProvider router={router} />);
}

test('replaces a crashed page with a way to recover', () => {
  renderFailingRoute(new ReferenceError('someHelper is not defined'));
  expect(screen.getByRole('heading', { name: 'Something broke' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  expect(console.error).toHaveBeenCalledWith('Route error', expect.any(ReferenceError));
});

test('explains a page that failed to download', () => {
  renderFailingRoute(new TypeError('Failed to fetch dynamically imported module: /HomePage.js'));
  expect(screen.getByRole('heading', { name: 'Page needs a reload' })).toBeInTheDocument();
});
