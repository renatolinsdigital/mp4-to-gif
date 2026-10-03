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
