import { useId } from 'react';

import {
  DONATION_EMAIL,
  DONATION_PRESETS,
  MAX_DONATION,
  MIN_DONATION,
  formatDonation,
} from '@/domain/helpers/donation';
import {
  CUSTOM_DONATION,
  useDonationAmount,
  type DonationChoice,
} from '@/domain/hooks/useDonationAmount';
import { Button } from '@/shared/components/Button';
import { SegmentedControl, type SegmentedOption } from '@/shared/components/SegmentedControl';
import { TextField } from '@/shared/components/TextField';
import { Icon } from '@/shared/icons';
import { PayPalLogo } from '@/shared/icons/PayPalLogo';
import { useToast } from '@/shared/hooks/useToast';

import styles from './DonationCard.module.scss';

const AMOUNT_OPTIONS: readonly SegmentedOption<DonationChoice>[] = [
  ...DONATION_PRESETS.map((preset) => ({
    value: `${preset.amount}` as const,
    label: formatDonation(preset.amount),
    hint: preset.hint,
  })),
  { value: CUSTOM_DONATION, label: 'Other', hint: 'You pick' },
];

const [EMAIL_USER, EMAIL_DOMAIN] = DONATION_EMAIL.split('@');

/** Amount picker and PayPal checkout link, plus the recipient email for sending directly. */
export function DonationCard() {
  const headingId = useId();
  const toast = useToast();
  const donation = useDonationAmount();

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(DONATION_EMAIL);
      toast.show('success', 'Email address copied.');
    } catch {
      toast.show('error', "Couldn't copy the address. Select it and copy it by hand.");
    }
  }

  return (
    <section className={styles.card} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId} className={styles.title}>
          Make a donation
        </h2>
        <span className={styles.secure}>
          <Icon name="lock" size={14} /> Secure checkout
        </span>
      </header>

      <div className={styles.body}>
        <SegmentedControl
          legend="Choose an amount"
          options={AMOUNT_OPTIONS}
          value={donation.choice}
          onChange={donation.setChoice}
          large
        />

        {donation.isCustom && (
          <TextField
            label="Your amount"
            value={donation.customInput}
            onChange={donation.setCustomInput}
            onBlur={donation.touchCustom}
            inputMode="decimal"
            autoComplete="off"
            suffix="USD"
            hint={`Any amount from ${formatDonation(MIN_DONATION)} to ${formatDonation(MAX_DONATION)}.`}
            error={donation.customError}
          />
        )}

        {donation.donateUrl && donation.amount !== null ? (
          <a
            className={styles.donate}
            href={donation.donateUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {/* The spaces keep the accessible name readable: "Donate $5 with PayPal". */}
            <span>Donate {formatDonation(donation.amount)} with</span>{' '}
            <PayPalLogo height={28} className={styles.logo} />{' '}
            <span className="visually-hidden">PayPal (opens in a new tab)</span>
          </a>
        ) : (
          // An amount is still missing or invalid; the field above says why.
          <button type="button" className={styles.donate} disabled>
            <span>Donate with</span> <PayPalLogo height={28} className={styles.logo} />{' '}
            <span className="visually-hidden">PayPal</span>
          </button>
        )}

        <p className={styles.fineprint}>
          You&apos;ll confirm the donation on paypal.com. This site never sees your payment details.
        </p>
      </div>

      <footer className={styles.footer}>
        <div className={styles.recipient}>
          <p className={styles.recipientLabel}>Or send it in the PayPal app to</p>
          {/* Narrow phones break the address before the @, not one letter from the end. */}
          <p className={styles.email}>
            {EMAIL_USER}
            <wbr />@{EMAIL_DOMAIN}
          </p>
        </div>
        <Button label="Copy email" variant="secondary" size="sm" icon="copy" onClick={copyEmail} />
      </footer>
    </section>
  );
}
