import { RouterProvider } from 'react-router/dom';

import { ConverterProvider } from '@/domain/components/ConverterProvider';
import { createAppRouter } from '@/routes/router';
import { ToastProvider } from '@/shared/components/Toast';

const router = createAppRouter();

export function App() {
  return (
    <ToastProvider>
      <ConverterProvider>
        <RouterProvider router={router} />
      </ConverterProvider>
    </ToastProvider>
  );
}
