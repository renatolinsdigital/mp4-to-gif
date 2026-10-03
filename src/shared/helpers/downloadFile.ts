/** Triggers a browser download for an existing object URL. */
export function downloadUrl(url: string, fileName: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
}

// Revoking immediately can cancel the download in some browsers, so wait a moment.
const REVOKE_DELAY_MS = 60_000;

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, fileName);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
