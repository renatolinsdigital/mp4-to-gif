import { createBrowserRouter, type RouteObject } from 'react-router';

import { AppLayout } from '@/app/AppLayout';
// Loaded up front, not lazily: it has to work when a page's chunk is the thing that failed.
import { RouteErrorPage } from '@/pages/RouteErrorPage';

// Routes are lazy-loaded so each page's code downloads only when it is first visited.
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    // Last resort, for an error in the layout itself.
    errorElement: <RouteErrorPage />,
    children: [
      {
        // Catches errors from any page and shows them inside the layout, so the header and
        // navigation keep working.
        errorElement: <RouteErrorPage />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/pages/HomePage')).HomePage }),
          },
          {
            path: 'converter',
            lazy: async () => ({
              Component: (await import('@/pages/ConverterPage')).ConverterPage,
            }),
          },
          {
            path: 'docs',
            lazy: async () => ({ Component: (await import('@/pages/DocsPage')).DocsPage }),
          },
          {
            path: '*',
            lazy: async () => ({
              Component: (await import('@/pages/NotFoundPage')).NotFoundPage,
            }),
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
