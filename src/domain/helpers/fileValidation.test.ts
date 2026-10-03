import { describe, expect, test } from 'vitest';

import { ConversionError } from './conversionErrors';
import {
  MAX_FILE_SIZE_BYTES,
  assertConvertibleMp4,
  hasMp4Signature,
  looksLikeMp4,
} from './fileValidation';

function mp4Header(boxType = 'ftyp'): Uint8Array<ArrayBuffer> {
  return new Uint8Array([
    0,
    0,
    0,
    0x20,
    ...Array.from(boxType, (char) => char.charCodeAt(0)),
    0x69,
    0x73,
    0x6f,
    0x6d,
  ]);
}

describe('looksLikeMp4', () => {
  test('accepts the MP4 MIME type or extension', () => {
    expect(looksLikeMp4({ name: 'a.bin', type: 'video/mp4' })).toBe(true);
    expect(looksLikeMp4({ name: 'clip.MP4', type: '' })).toBe(true);
    expect(looksLikeMp4({ name: 'clip.m4v', type: '' })).toBe(true);
  });

  test('rejects other files', () => {
    expect(looksLikeMp4({ name: 'clip.mov', type: 'video/quicktime' })).toBe(false);
    expect(looksLikeMp4({ name: 'photo.png', type: 'image/png' })).toBe(false);
  });
});

describe('hasMp4Signature', () => {
  test('recognizes ISO media boxes', () => {
    expect(hasMp4Signature(mp4Header('ftyp'))).toBe(true);
    expect(hasMp4Signature(mp4Header('free'))).toBe(true);
  });

  test('rejects other data and short headers', () => {
    expect(hasMp4Signature(new TextEncoder().encode('<html><body>'))).toBe(false);
    expect(hasMp4Signature(new Uint8Array([0, 0, 0]))).toBe(false);
  });
});

describe('assertConvertibleMp4', () => {
  const expectCode = async (file: File, code: string) => {
    const error = await assertConvertibleMp4(file).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ConversionError);
    expect((error as ConversionError).code).toBe(code);
  };

  test('passes a real MP4 header', async () => {
    await expect(assertConvertibleMp4(new File([mp4Header()], 'a.mp4'))).resolves.toBeUndefined();
  });

  test('flags renamed non-MP4 files as invalid', async () => {
    await expectCode(new File(['not a video at all'], 'fake.mp4'), 'invalid-mp4');
  });

  test('flags empty files as corrupted', async () => {
    await expectCode(new File([], 'empty.mp4'), 'corrupted');
  });

  test('flags files over the size limit', async () => {
    const file = new File([mp4Header()], 'huge.mp4');
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE_BYTES + 1 });
    await expectCode(file, 'file-too-large');
  });
});
