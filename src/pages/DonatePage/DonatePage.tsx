import { Link } from 'react-router';

import { DonationCard } from '@/domain/components/DonationCard';
import { Icon, type IconName } from '@/shared/icons';

import styles from './DonatePage.module.scss';

const PROMISES = ['No ads', 'No sign-up', 'No uploads'] as const;

const SUPPORT_AREAS: ReadonlyArray<{ icon: IconName; title: string; text: string }> = [
  {
    icon: 'sparkle',
    title: 'Better GIFs',
    text: 'Time to tune presets, palettes and dithering so GIFs come out sharper and smaller.',
  },
  {
    icon: 'refresh',
    title: 'Upkeep',
    text: 'Bug fixes, keeping up with browser changes, and docs that stay accurate.',
  },
  {
    icon: 'lock',
    title: 'Free & private',
    text: 'The converter stays free for everyone, and your videos stay on your device.',
  },
];

export function DonatePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="donate-title">
        <div className={styles.heroText}>
          <h1 id="donate-title" className={styles.title}>
            Keep it <span className={styles.sticker}>free</span>
          </h1>
          <p className={styles.lead}>
            MP4 to GIF is free to use and your videos never leave your device. If it saved you some
            time, a small donation helps keep it running and getting better.
          </p>
          <ul className={styles.promises} role="list">
            {PROMISES.map((promise) => (
              <li key={promise}>
                <Icon name="check" size={18} /> {promise}
              </li>
            ))}
          </ul>
        </div>

        <DonationCard />
      </section>

      <section aria-labelledby="where-it-goes">
        <h2 id="where-it-goes" className={styles.sectionTitle}>
          Where it goes
        </h2>
        <ul className={styles.areas} role="list">
          {SUPPORT_AREAS.map((area) => (
            <li key={area.title} className={styles.area}>
              <span className={styles.areaIcon}>
                <Icon name={area.icon} size={24} />
              </span>
              <h3>{area.title}</h3>
              <p>{area.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.thanks} aria-labelledby="thanks">
        <div>
          <h2 id="thanks" className={styles.thanksTitle}>
            Thank you
          </h2>
          <p className={styles.thanksText}>
            Not today? No problem. Sharing the converter with a friend helps too.
          </p>
        </div>
        <Link to="/converter" className={styles.thanksLink}>
          Open the converter <Icon name="arrowRight" size={20} />
        </Link>
      </section>
    </div>
  );
}
