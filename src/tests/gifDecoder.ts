/**
 * Minimal GIF decoder for tests: parses the stream and composites each frame the way a
 * viewer would (frame rectangles, transparency, "do not dispose"), so tests can check what
 * the encoder's output actually looks like rather than its bytes.
 */

export interface DecodedFrame {
  rect: { left: number; top: number; width: number; height: number };
  delayCs: number;
  transparentIndex: number;
  hasLocalPalette: boolean;
  /** Raw palette indices of the frame's rectangle. */
  indices: Uint8Array;
  /** Full canvas, RGB per pixel, after this frame is drawn. */
  canvas: Uint8Array;
}

export interface DecodedGif {
  width: number;
  height: number;
  /** NETSCAPE loop count, or null when the extension is absent (plays once). */
  loopCount: number | null;
  frames: DecodedFrame[];
}

/** Decodes GIF LZW data (code size byte, sub-blocks, terminator) starting at `offset`. */
export function decodeLzw(bytes: Uint8Array, offset = 0): { indices: number[]; end: number } {
  const minCodeSize = bytes[offset++] as number;
  const data: number[] = [];
  for (let size = bytes[offset++] as number; size > 0; size = bytes[offset++] as number) {
    for (let i = 0; i < size; i++) data.push(bytes[offset++] as number);
  }

  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let table: number[][] = [];
  let codeBits = minCodeSize + 1;
  let running = 0;
  let previous: number[] | null = null;
  const reset = () => {
    table = Array.from({ length: clearCode + 2 }, (_, i) => [i]);
    codeBits = minCodeSize + 1;
    running = clearCode + 2;
    previous = null;
  };
  reset();

  const indices: number[] = [];
  let bitPosition = 0;
  while (bitPosition + codeBits <= data.length * 8) {
    let code = 0;
    for (let bit = 0; bit < codeBits; bit++, bitPosition++) {
      code |= (((data[bitPosition >> 3] as number) >> (bitPosition & 7)) & 1) << bit;
    }
    if (code === clearCode) {
      reset();
      continue;
    }
    if (code === endCode) return { indices, end: offset };

    let entry: number[];
    if (code < table.length) {
      entry = table[code] as number[];
    } else if (code === table.length && previous) {
      entry = [...(previous as number[]), (previous as number[])[0] as number];
    } else {
      throw new Error(`Invalid LZW code ${code} (table size ${table.length})`);
    }
    indices.push(...entry);
    if (previous && table.length < 4096)
      table.push([...(previous as number[]), entry[0] as number]);
    previous = entry;
    // Mirrors giflib: the width grows once the running code passes the current maximum.
    if (running < 4097 && ++running > 1 << codeBits && codeBits < 12) codeBits++;
  }
  throw new Error('LZW data ended without an end code');
}

export function decodeGif(bytes: Uint8Array): DecodedGif {
  const ascii = String.fromCharCode(...bytes.subarray(0, 6));
  if (ascii !== 'GIF89a') throw new Error(`Not a GIF89a stream: ${ascii}`);
  const u16 = (at: number) => (bytes[at] as number) | ((bytes[at + 1] as number) << 8);

  const width = u16(6);
  const height = u16(8);
  const packed = bytes[10] as number;
  let offset = 13;
  let globalPalette = new Uint8Array(0);
  if (packed & 0x80) {
    const size = 3 << ((packed & 7) + 1);
    globalPalette = bytes.slice(offset, offset + size);
    offset += size;
  }

  const canvas = new Uint8Array(width * height * 3);
  const frames: DecodedFrame[] = [];
  let loopCount: number | null = null;
  let delayCs = 0;
  let transparentIndex = -1;

  while (offset < bytes.length) {
    const block = bytes[offset++];
    if (block === 0x3b) return { width, height, loopCount, frames };

    if (block === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) {
        const flags = bytes[offset + 1] as number;
        delayCs = u16(offset + 2);
        transparentIndex = flags & 1 ? (bytes[offset + 4] as number) : -1;
        if (((flags >> 2) & 7) > 1) throw new Error('Test decoder only supports dispose 0/1');
      } else if (
        label === 0xff &&
        String.fromCharCode(...bytes.subarray(offset + 1, offset + 12)) === 'NETSCAPE2.0'
      ) {
        loopCount = u16(offset + 14);
      }
      for (let size = bytes[offset++] as number; size > 0; size = bytes[offset++] as number) {
        offset += size;
      }
      continue;
    }

    if (block !== 0x2c)
      throw new Error(`Unexpected block 0x${block?.toString(16)} at ${offset - 1}`);
    const rect = {
      left: u16(offset),
      top: u16(offset + 2),
      width: u16(offset + 4),
      height: u16(offset + 6),
    };
    const flags = bytes[offset + 8] as number;
    offset += 9;
    let palette = globalPalette;
    const hasLocalPalette = (flags & 0x80) !== 0;
    if (hasLocalPalette) {
      const size = 3 << ((flags & 7) + 1);
      palette = bytes.slice(offset, offset + size);
      offset += size;
    }
    const { indices, end } = decodeLzw(bytes, offset);
    offset = end;
    if (indices.length < rect.width * rect.height) {
      throw new Error(`Frame has ${indices.length} pixels, expected ${rect.width * rect.height}`);
    }

    for (let y = 0; y < rect.height; y++) {
      for (let x = 0; x < rect.width; x++) {
        const index = indices[y * rect.width + x] as number;
        if (index === transparentIndex) continue;
        const d = ((rect.top + y) * width + rect.left + x) * 3;
        canvas.set(palette.subarray(index * 3, index * 3 + 3), d);
      }
    }
    frames.push({
      rect,
      delayCs,
      transparentIndex,
      hasLocalPalette,
      indices: Uint8Array.from(indices.slice(0, rect.width * rect.height)),
      canvas: canvas.slice(),
    });
    transparentIndex = -1;
    delayCs = 0;
  }
  throw new Error('GIF ended without a trailer');
}
