import { Link } from 'react-router';

import {
  PIXEL_SKIP_THRESHOLDS,
  QUALITY_PRESETS,
  QUALITY_PRESET_ORDER,
} from '@/domain/helpers/qualityPresets';
import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import type { DitherMode, LossyLevel } from '@/domain/types/conversion';
import { Icon, type IconName } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './HomePage.module.scss';

const TICKER_ITEMS = ['Full HD 1920×1080', 'Five presets', 'Optimized GIFs', 'Zero uploads'];

const STEPS = [
  {
    title: 'Add your video',
    text: 'Drop in an MP4 file, or pick one from your device.',
  },
  {
    title: 'Pick a preset',
    text: 'Five presets from Compact to Full HD, or set the size and frame rate yourself. Trim a section if you only need part.',
  },
  {
    title: 'Convert & download',
    text: 'Convert, check the preview, and download your GIF.',
  },
] as const;

const FEATURES: ReadonlyArray<{ icon: IconName; title: string; text: string; isNew?: boolean }> = [
  {
    icon: 'monitor',
    title: 'Full HD export',
    text: 'One tap for 1280 (HD) or 1920 (Full HD) wide GIFs. Smaller videos are never upscaled.',
    isNew: true,
  },
  {
    icon: 'sparkle',
    title: 'Smooth gradients',
    text: 'The Full HD preset uses error-diffusion dithering and adaptive palettes. Fine-tune colors, dithering, pixel skipping and lossy compression yourself.',
    isNew: true,
  },
  {
    icon: 'lock',
    title: 'Private by design',
    text: 'Videos are decoded and encoded inside your browser. Nothing is uploaded, and there is no account.',
  },
  {
    icon: 'sliders',
    title: 'Optimized GIFs',
    text: 'Pixels that don’t change between frames are skipped and colors are reused where it saves bytes, so each GIF stays as small as its look allows.',
  },
];

// Each column header links to the docs entry that explains it.
const TABLE_COLUMNS = [
  { label: 'Preset', docsId: 'presets-overview' },
  { label: 'Width', docsId: 'resolution' },
  { label: 'FPS', docsId: 'frame-rate' },
  { label: 'Colors', docsId: 'colors-per-palette' },
  { label: 'Palette', docsId: 'palette' },
  { label: 'Dithering', docsId: 'dithering' },
  { label: 'Pixel skip', docsId: 'pixel-skip' },
  { label: 'Lossy', docsId: 'lossy' },
] as const;

const DITHER_LABELS: Record<DitherMode, string> = {
  off: 'Off',
  ordered: 'Ordered',
  diffusion: 'Diffusion',
};
const LOSSY_LABELS: Record<LossyLevel, string> = {
  off: 'Off',
  light: 'Light',
  medium: 'Medium',
  strong: 'Strong',
};

export function HomePage() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>
            <Icon name="lock" size={16} /> Runs locally in your browser
          </p>
          <h1 className={styles.title}>
            MP4{' '}
            <span className={styles.arrow} aria-hidden="true">
              →
            </span>
            <span className="visually-hidden">to</span> GIF
          </h1>
          <p className={styles.lead}>
            Turn videos into sharp, optimized GIFs, up to Full HD. Pick a preset, press convert,
            download. Your videos never leave your device.
          </p>
          <div className={styles.ctas}>
            <Link to="/converter" className={cx(styles.cta, styles.ctaPrimary)}>
              Open the converter <Icon name="arrowRight" size={20} />
            </Link>
            <a href="#how-it-works" className={styles.cta}>
              How it works
            </a>
          </div>
        </div>

        <figure className={styles.spec}>
          <figcaption className={styles.specHeader}>
            <span>Best export</span>
            <span className={styles.specTag}>Full HD preset</span>
          </figcaption>
          <div className={styles.specPreview} aria-hidden="true">
            <Icon name="film" size={56} />
          </div>
          <dl className={styles.specFacts}>
            <div>
              <dt>Size</dt>
              <dd>1920×1080</dd>
            </div>
            <div>
              <dt>Colors</dt>
              <dd>256/frame</dd>
            </div>
            <div>
              <dt>FPS</dt>
              <dd>up to 30</dd>
            </div>
          </dl>
        </figure>
      </section>

      <ul className={styles.ticker} role="list" aria-hidden="true">
        {TICKER_ITEMS.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className={styles.sectionTitle}>
          How it works
        </h2>
        <ol className={styles.steps}>
          {STEPS.map((step, index) => (
            <li key={step.title} className={styles.card}>
              <span className={styles.stepNumber} aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="presets">
        <div className={styles.sectionHead}>
          <h2 id="presets" className={styles.sectionTitle}>
            Presets
          </h2>
          <p className={styles.sectionLead}>
            Each step up is sharper and smoother, and makes bigger files.{' '}
            <Link to={{ pathname: '/docs', hash: 'presets-overview' }}>
              What every column means
            </Link>
          </p>
        </div>
        <div className={styles.tableBox}>
          <table className={styles.table}>
            <thead>
              <tr>
                {TABLE_COLUMNS.map((column) => (
                  <th key={column.label} scope="col">
                    <Link
                      to={{ pathname: '/docs', hash: column.docsId }}
                      className={styles.docsLink}
                    >
                      {column.label}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUALITY_PRESET_ORDER.map((key) => {
                const preset = QUALITY_PRESETS[key];
                const isDefault = key === DEFAULT_SETTINGS.quality;
                return (
                  <tr key={key} className={cx(isDefault && styles.highlightRow)}>
                    <th scope="row">
                      {preset.label}
                      {/* The space keeps the row's accessible name readable: "Standard Default". */}
                      {isDefault && (
                        <>
                          {' '}
                          <span className={styles.tag}>Default</span>
                        </>
                      )}
                    </th>
                    <td>{preset.width} px</td>
                    <td>{preset.frameRate}</td>
                    <td>{preset.maxColors}</td>
                    <td>{preset.paletteMode === 'global' ? 'Shared' : 'Adaptive'}</td>
                    <td>{DITHER_LABELS[preset.dither]}</td>
                    <td>
                      {PIXEL_SKIP_THRESHOLDS[preset.pixelSkip] === 0
                        ? 'Off'
                        : `≤ ${PIXEL_SKIP_THRESHOLDS[preset.pixelSkip]}`}
                    </td>
                    <td>{LOSSY_LABELS[preset.lossy]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="features">
        <h2 id="features" className={styles.sectionTitle}>
          What you get
        </h2>
        <ul className={styles.features} role="list">
          {FEATURES.map((feature) => (
            <li key={feature.title} className={styles.card}>
              <span className={cx(styles.featureIcon, feature.isNew && styles.featureIconNew)}>
                <Icon name={feature.icon} size={24} />
              </span>
              <h3>
                {feature.title}
                {feature.isNew && <span className={styles.tag}>New</span>}
              </h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
