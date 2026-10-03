import { useState } from 'react';

import {
  DEFAULT_DONATION,
  type DONATION_PRESETS,
  buildPayPalDonateUrl,
  validateDonationAmount,
} from '@/domain/helpers/donation';

export const CUSTOM_DONATION = 'custom';

export type DonationChoice =
  `${(typeof DONATION_PRESETS)[number]['amount']}` | typeof CUSTOM_DONATION;

/** Tracks the chosen donation amount, preset or typed, and the PayPal link for it. */
export function useDonationAmount() {
  const [choice, setChoice] = useState<DonationChoice>(`${DEFAULT_DONATION}`);
  const [customInput, setCustomInput] = useState('');
  // A half-typed amount isn't an error yet, so the message waits until the field loses focus.
  const [customTouched, setCustomTouched] = useState(false);

  const isCustom = choice === CUSTOM_DONATION;
  const result = isCustom ? validateDonationAmount(customInput) : { value: Number(choice) };
  const amount = 'value' in result ? result.value : null;

  return {
    choice,
    setChoice,
    isCustom,
    customInput,
    setCustomInput,
    touchCustom: () => setCustomTouched(true),
    customError: isCustom && customTouched && 'error' in result ? result.error : undefined,
    amount,
    donateUrl: amount === null ? null : buildPayPalDonateUrl(amount),
  };
}
