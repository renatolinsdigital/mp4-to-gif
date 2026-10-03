import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';

import { DONATION_EMAIL } from '@/domain/helpers/donation';
import { ToastProvider } from '@/shared/components/Toast';

import { DonationCard } from './DonationCard';

function renderCard() {
  return render(
    <ToastProvider>
      <DonationCard />
    </ToastProvider>,
  );
}

function donateLink() {
  return screen.getByRole('link', { name: /^Donate .* with PayPal/ });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test('starts at $5 and links to PayPal with that amount in a new tab', () => {
  renderCard();
  expect(screen.getByRole('radio', { name: '$5 Snack' })).toBeChecked();

  const link = donateLink();
  expect(link).toHaveAccessibleName('Donate $5 with PayPal (opens in a new tab)');
  expect(link).toHaveAttribute('target', '_blank');
  const url = new URL(link.getAttribute('href') ?? '');
  expect(url.hostname).toBe('www.paypal.com');
  expect(url.searchParams.get('business')).toBe(DONATION_EMAIL);
  expect(url.searchParams.get('amount')).toBe('5.00');
});

test('updates the link when another preset is picked', () => {
  renderCard();
  fireEvent.click(screen.getByRole('radio', { name: '$25 Big fan' }));
  expect(donateLink()).toHaveAccessibleName('Donate $25 with PayPal (opens in a new tab)');
  expect(new URL(donateLink().getAttribute('href') ?? '').searchParams.get('amount')).toBe('25.00');
});

test('disables donating until a valid custom amount is entered', () => {
  renderCard();
  fireEvent.click(screen.getByRole('radio', { name: 'Other You pick' }));

  expect(screen.queryByRole('link', { name: /Donate/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Donate with PayPal' })).toBeDisabled();

  const field = screen.getByLabelText('Your amount');
  fireEvent.change(field, { target: { value: '7,50' } });
  expect(donateLink()).toHaveAccessibleName('Donate $7.50 with PayPal (opens in a new tab)');
});

test('explains an invalid custom amount once the field loses focus', () => {
  renderCard();
  fireEvent.click(screen.getByRole('radio', { name: 'Other You pick' }));

  const field = screen.getByLabelText('Your amount');
  fireEvent.change(field, { target: { value: '0.5' } });
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();

  fireEvent.blur(field);
  expect(screen.getByRole('alert')).toHaveTextContent('The minimum is $1.');
  expect(field).toHaveAttribute('aria-invalid', 'true');
});

test('copies the recipient email and confirms it', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  renderCard();

  expect(screen.getByText(DONATION_EMAIL)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));

  expect(writeText).toHaveBeenCalledWith(DONATION_EMAIL);
  expect(await screen.findByRole('status')).toHaveTextContent('Email address copied.');
});

test('tells the user when copying fails', async () => {
  const writeText = vi.fn().mockRejectedValue(new Error('denied'));
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  renderCard();

  fireEvent.click(screen.getByRole('button', { name: 'Copy email' }));

  expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't copy the address");
});
