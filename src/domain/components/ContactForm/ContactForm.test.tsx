import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { ContactNotConfiguredError } from '@/domain/services/contact.service';
import { ToastProvider } from '@/shared/components/Toast';

import { ContactForm } from './ContactForm';

function renderForm(submit = vi.fn(async () => {})) {
  render(
    <ToastProvider>
      <ContactForm submit={submit} />
    </ToastProvider>,
  );
  return submit;
}

function fillValidForm() {
  fireEvent.change(screen.getByRole('textbox', { name: /Name/ }), { target: { value: 'Ada' } });
  fireEvent.change(screen.getByRole('textbox', { name: /Email/ }), {
    target: { value: 'ada@example.com' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: /Message/ }), {
    target: { value: 'The converter works great.' },
  });
}

test('renders name, email and message fields', () => {
  renderForm();
  expect(screen.getByRole('form', { name: 'Contact form' })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Name/ })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Email/ })).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: /Message/ })).toBeInTheDocument();
});

test('shows accessible errors and does not submit invalid input', () => {
  const submit = renderForm();
  fireEvent.change(screen.getByRole('textbox', { name: /Email/ }), { target: { value: 'nope' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole('textbox', { name: /Name/ })).toHaveAccessibleDescription('Enter your name.');
  expect(screen.getByRole('textbox', { name: /Email/ })).toHaveAccessibleDescription(
    'Enter a valid email address.',
  );
});

test('submits valid input, confirms with a toast and resets the form', async () => {
  const submit = renderForm();
  fillValidForm();
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/message was sent/));
  expect(submit).toHaveBeenCalledWith({
    name: 'Ada',
    email: 'ada@example.com',
    message: 'The converter works great.',
  });
  expect(screen.getByRole('textbox', { name: /Name/ })).toHaveValue('');
});

test('explains when the contact endpoint is not configured', async () => {
  renderForm(
    vi.fn(async () => {
      throw new ContactNotConfiguredError();
    }),
  );
  fillValidForm();
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/turned off/));
});
