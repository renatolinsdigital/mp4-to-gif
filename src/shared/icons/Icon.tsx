const ICON_PATHS = {
  upload: 'M12 16V4m0 0L6 10m6-6 6 6M4 20h16',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  download: 'M12 4v12m0 0 6-6m-6 6-6-6M4 20h16',
  close: 'M6 6l12 12M18 6 6 18',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 3 2 21h20zM12 10v5m0 3v.5',
  info: 'M12 16v-5m0-3v.5M3 3h18v18H3z',
  refresh: 'M20 11a8 8 0 0 0-14.9-3.9L4 8m0-4v4h4M4 13a8 8 0 0 0 14.9 3.9L20 16m0 4v-4h-4',
  play: 'M7 4.5v15l12-7.5z',
  stop: 'M6 6h12v12H6z',
  plus: 'M12 5v14M5 12h14',
  archive: 'M3 4h18v5H3zM5 9v11h14V9M10 13h4',
  sliders: 'M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4',
  arrowRight: 'M4 12h16m-6-6 6 6-6 6',
  sparkle: 'M13 2 4 14h7l-1 8 9-12h-7z',
  cpu: 'M7 7h10v10H7zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z',
  chevronDown: 'M6 9l6 6 6-6',
  monitor: 'M2 4h20v13H2zM8 21h8M12 17v4',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 21 21',
  book: 'M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
}

/** Decorative stroke icon. Always pair it with visible text or an accessible label. */
export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
