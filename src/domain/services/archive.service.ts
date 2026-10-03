import { zip, type Zippable } from 'fflate';

export interface ArchiveEntry {
  name: string;
  blob: Blob;
}

/**
 * Packs files into a single ZIP. GIFs are already LZW-compressed, so entries are stored
 * without recompression (level 0), which is much faster for the same output size.
 */
export async function createZipArchive(entries: ArchiveEntry[]): Promise<Blob> {
  const files: Zippable = {};
  for (const entry of entries) {
    files[entry.name] = [new Uint8Array(await entry.blob.arrayBuffer()), { level: 0 }];
  }

  const bytes = await new Promise<Uint8Array>((resolve, reject) => {
    zip(files, (error, data) => (error ? reject(error) : resolve(data)));
  });
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}
