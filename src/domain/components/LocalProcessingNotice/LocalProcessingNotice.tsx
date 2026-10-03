import { Icon } from '@/shared/icons';

import styles from './LocalProcessingNotice.module.scss';

/** States plainly that videos never leave the device. See business rule "Local processing only". */
export function LocalProcessingNotice() {
  return (
    <p className={styles.notice}>
      <Icon name="lock" size={18} className={styles.icon} />
      <span>
        <strong>Your videos stay on this device.</strong> Conversion runs entirely in your browser.
        Nothing is uploaded, and no account is needed.
      </span>
    </p>
  );
}
