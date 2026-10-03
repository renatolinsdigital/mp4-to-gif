/** Strips the extension and any characters that are unsafe in file names. */
export function gifBaseName(sourceFileName: string): string {
  const withoutExtension = sourceFileName.replace(/\.[^./\\]+$/, '');
  const safe = withoutExtension.replace(/[\\/:*?"<>|]+/g, '-').trim();
  return safe.length > 0 ? safe : 'video';
}

/** `my-video.mp4` becomes `my-video.gif`. */
export function gifFileName(sourceFileName: string): string {
  return `${gifBaseName(sourceFileName)}.gif`;
}

/**
 * Picks `name.gif`, then `name-2.gif`, `name-3.gif` and so on until the name is free.
 * Comparison ignores case because most file systems do.
 * See .claude/product/business-rules.md, "Generated GIF names are unique".
 */
export function uniqueGifName(sourceFileName: string, takenNames: Iterable<string>): string {
  const base = gifBaseName(sourceFileName);
  const taken = new Set(Array.from(takenNames, (name) => name.toLowerCase()));

  let candidate = `${base}.gif`;
  for (let suffix = 2; taken.has(candidate.toLowerCase()); suffix++) {
    candidate = `${base}-${suffix}.gif`;
  }
  return candidate;
}

export function archiveFileName(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `gifs-${stamp}.zip`;
}
