import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useToast } from '@/shared/hooks/useToast';

import { TOAST_DURATION_MS, Toast } from './Toast';
import { ToastProvider } from './ToastProvider';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('renders the message and correct variant class', () => {
  render(<Toast variant="success" message="Saved" />);
  const toast = screen.getByRole('status');
  expect(toast).toHaveTextContent('Saved');
  expect(toast.className).toMatch(/success/);
});

test('uses role="alert" for errors', () => {
  render(<Toast variant="error" message="Failed" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Failed');
});

function Trigger() {
  const toast = useToast();
  return (
    <button type="button" onClick={() => toast.show('info', 'Hello')}>
      Notify
    </button>
  );
}

test('shows a toast and dismisses it automatically after 3 seconds', () => {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  expect(screen.getByRole('status')).toHaveTextContent('Hello');

  act(() => {
    vi.advanceTimersByTime(TOAST_DURATION_MS);
  });
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('stacks multiple toasts', () => {
  render(
    <ToastProvider>
      <Trigger />
    </ToastProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  expect(screen.getAllByRole('status')).toHaveLength(2);
});
