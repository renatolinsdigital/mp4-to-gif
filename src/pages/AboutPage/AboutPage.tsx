import { ContactForm } from '@/domain/components/ContactForm';
import { Panel } from '@/shared/components/Panel';

import styles from './AboutPage.module.scss';

export function AboutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.intro}>
        <h1 className={styles.title}>About</h1>
        <p className={styles.lead}>
          MP4 to GIF is a small, focused tool for turning several videos into GIFs at once. It
          runs entirely in your browser: your files are read from your device, converted in a
          background thread, and handed back to you as downloads.
        </p>
      </header>

      <section className={styles.facts} aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">Privacy</h2>
        <p>
          Videos are never uploaded. The only network request this site makes is sending the
          contact form below, and only when you submit it.
        </p>
        <h2>Browser support</h2>
        <p>
          Conversion uses your browser&apos;s built-in video decoder. Any MP4 your browser can play
          (typically H.264) can be converted. Some browsers can&apos;t decode HEVC/H.265; those
          files are flagged in the queue with an explanation.
        </p>
      </section>

      <Panel title="Contact" description="Questions, bug reports or ideas are all welcome.">
        <ContactForm />
      </Panel>
    </div>
  );
}
