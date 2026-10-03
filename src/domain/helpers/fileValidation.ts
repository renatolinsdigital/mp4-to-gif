import { ConversionError } from '@/domain/helpers/conversionErrors';

/** See .claude/product/business-rules.md, "Maximum source file size". */
export const MAX_FILE_SIZE_BYTES = 2 * 1024 ** 3;

// Top-level ISO base media boxes an MP4 can legally start with. Almost every file starts
// with `ftyp`, but some recorders write `free`/`wide`/`mdat` first.
const MP4_LEADING_BOX_TYPES = new Set(['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide', 'pnot']);

/** Cheap check on name and MIME type, used to filter dropped files before reading them. */
export function looksLikeMp4(file: Pick<File, 'name' | 'type'>): boolean {
  if (file.type === 'video/mp4') return true;
  return /\.(mp4|m4v)$/i.test(file.name);
}

/** Validates the first bytes of the file against the MP4 container layout. */
export function hasMp4Signature(header: Uint8Array): boolean {
  if (header.length < 8) return false;
  const boxType = String.fromCharCode(...header.subarray(4, 8));
  return MP4_LEADING_BOX_TYPES.has(boxType);
}

export async function readFileHeader(file: Blob, length = 12): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, length).arrayBuffer());
}

/** Throws a ConversionError when the file can't be an MP4 we can convert. */
export async function assertConvertibleMp4(file: File): Promise<void> {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new ConversionError('file-too-large');
  if (file.size === 0) throw new ConversionError('corrupted');
  if (!hasMp4Signature(await readFileHeader(file))) throw new ConversionError('invalid-mp4');
}
