import { z } from 'zod';

/** PayPal account that receives donations. */
export const DONATION_EMAIL = 'renato.digital.crafts@gmail.com';
export const DONATION_CURRENCY = 'USD';
export const MIN_DONATION = 1;
export const MAX_DONATION = 10_000;

export const DONATION_PRESETS = [
  { amount: 3, hint: 'Coffee' },
  { amount: 5, hint: 'Snack' },
  { amount: 10, hint: 'Lunch' },
  { amount: 25, hint: 'Big fan' },
] as const;

export const DEFAULT_DONATION = 5;

// PayPal's hosted donate page. `business` takes the recipient's email, which is how a
// personal account (one without a hosted button ID) receives donations.
const PAYPAL_DONATE_URL = 'https://www.paypal.com/donate/';
const DONATION_PURPOSE = 'Support for the MP4 to GIF converter';

const currencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: DONATION_CURRENCY,
});
const wholeCurrencyFormat = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: DONATION_CURRENCY,
  maximumFractionDigits: 0,
});

/** "$5" for whole amounts, "$7.50" otherwise. */
export function formatDonation(amount: number): string {
  return Number.isInteger(amount)
    ? wholeCurrencyFormat.format(amount)
    : currencyFormat.format(amount);
}

const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

// Empty input becomes undefined and anything that isn't a plain amount becomes NaN, so the
// number schema below can tell the two apart. A comma is accepted as the decimal mark, since
// many donors write "7,50".
function parseAmountInput(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  const value = input.trim().replace(',', '.');
  if (value === '') return undefined;
  return AMOUNT_PATTERN.test(value) ? Number(value) : Number.NaN;
}

// Avoids z.string() on purpose: Zod is in the entry chunk, and ZodString would bring every
// string format (email, URL, UUID...) along with it, about 17 kB on every page.
export const donationAmountSchema = z.preprocess(
  parseAmountInput,
  z
    .number({
      error: (issue) =>
        issue.input === undefined ? 'Enter an amount.' : 'Use a number like 5 or 7.50.',
    })
    .min(MIN_DONATION, `The minimum is ${formatDonation(MIN_DONATION)}.`)
    .max(MAX_DONATION, `The maximum is ${formatDonation(MAX_DONATION)}.`),
);

export function validateDonationAmount(input: string): { value: number } | { error: string } {
  const parsed = donationAmountSchema.safeParse(input);
  if (parsed.success) return { value: parsed.data };
  return { error: parsed.error.issues[0]?.message ?? 'Invalid amount.' };
}

/** Link to PayPal's donate page with the recipient, amount and currency filled in. */
export function buildPayPalDonateUrl(amount: number): string {
  const params = new URLSearchParams({
    business: DONATION_EMAIL,
    amount: amount.toFixed(2),
    currency_code: DONATION_CURRENCY,
    item_name: DONATION_PURPOSE,
    no_recurring: '0',
  });
  return `${PAYPAL_DONATE_URL}?${params.toString()}`;
}
