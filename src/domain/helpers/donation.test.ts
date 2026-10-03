import { describe, expect, test } from 'vitest';

import {
  DONATION_EMAIL,
  buildPayPalDonateUrl,
  formatDonation,
  validateDonationAmount,
} from './donation';

describe('validateDonationAmount', () => {
  test.each([
    ['5', 5],
    ['7.5', 7.5],
    ['7.50', 7.5],
    ['7,50', 7.5],
    [' 12 ', 12],
    ['10000', 10_000],
  ])('accepts %j as %d', (input, expected) => {
    expect(validateDonationAmount(input)).toEqual({ value: expected });
  });

  test.each([
    ['', 'Enter an amount.'],
    ['   ', 'Enter an amount.'],
    ['abc', 'Use a number like 5 or 7.50.'],
    ['5.123', 'Use a number like 5 or 7.50.'],
    ['-5', 'Use a number like 5 or 7.50.'],
    ['0.50', 'The minimum is $1.'],
    ['10000.01', 'The maximum is $10,000.'],
  ])('rejects %j', (input, error) => {
    expect(validateDonationAmount(input)).toEqual({ error });
  });
});

test('formats whole amounts without cents and others with two decimals', () => {
  expect(formatDonation(5)).toBe('$5');
  expect(formatDonation(7.5)).toBe('$7.50');
  expect(formatDonation(10_000)).toBe('$10,000');
});

test('builds a PayPal donate link for the recipient, amount and currency', () => {
  const url = new URL(buildPayPalDonateUrl(7.5));
  expect(url.origin + url.pathname).toBe('https://www.paypal.com/donate/');
  expect(url.searchParams.get('business')).toBe(DONATION_EMAIL);
  expect(url.searchParams.get('amount')).toBe('7.50');
  expect(url.searchParams.get('currency_code')).toBe('USD');
});
