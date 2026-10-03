import { createBrowserRouter, type RouteObject } from 'react-router';

import { AppLayout } from '@/app/AppLayout';

// Routes are lazy-loaded so each page's code downloads only when it is first visited.
export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('@/pages/HomePage')).HomePage }),
      },
      {
        path: 'converter',
        lazy: async () => ({ Component: (await import('@/pages/ConverterPage')).ConverterPage }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('@/pages/AboutPage')).AboutPage }),
      },
      {
        path: '*',
        lazy: async () => ({ Component: (await import('@/pages/NotFoundPage')).NotFoundPage }),
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
