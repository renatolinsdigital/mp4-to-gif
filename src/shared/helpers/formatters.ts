const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1);
  const value = bytes / 1024 ** exponent;
  const digits = exponent === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${BYTE_UNITS[exponent]}`;
}

/** 75.4 -> "1:15", 3725 -> "1:02:05". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}` : `${minutes}:${secs}`;
}

/** Seconds with one decimal, for section start/end points: 12.34 -> "12.3 s". */
export function formatSeconds(seconds: number): string {
  return `${(Math.round(seconds * 10) / 10).toFixed(1)} s`;
}

/** Playback speed multiplier: 2 -> "2×", 0.25 -> "0.25×". */
export function formatSpeed(speed: number): string {
  return `${speed}×`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width}×${height}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
