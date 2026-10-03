import type { FrameRect } from '@/domain/helpers/gifPixels';
import { LzwEncoder, type ByteSink, type LossyMatch } from '@/domain/services/gif/lzwEncoder';

export interface GifFrame {
  /** Area of the canvas this frame redraws. Pixels outside it stay as they were. */
  rect: FrameRect;
  /** Palette indices for `rect`, row by row. */
  indices: Uint8Array;
  /** RGB triples. Required for the first frame, whose palette becomes the global one. Omitted later, the global palette applies. */
  palette?: Uint8Array;
  delayMs: number;
  /** Index drawn as transparent, or -1 for none. */
  transparentIndex: number;
  /** Lets the LZW stage approximate pixels; see `LossyMatch`. */
  lossy?: Pick<LossyMatch, 'tolerance' | 'keepTolerance' | 'below' | 'source'>;
}

// GIF disposal method 1 ("do not dispose") keeps the previous frame on screen, which is
// what lets transparent pixels show through as "unchanged".
const DISPOSE_KEEP_PREVIOUS = 1;
const MAX_DELAY_CS = 0xffff;

/** Bits needed to index a color table of `count` entries; GIF tables hold 2–256 colors. */
function tableBits(count: number): number {
  return Math.max(1, Math.ceil(Math.log2(count)));
}

/** Growable byte buffer. */
class ByteBuffer implements ByteSink {
  private data = new Uint8Array(1 << 16);
  length = 0;

  writeByte(value: number): void {
    this.reserve(1);
    this.data[this.length++] = value;
  }

  writeBytes(bytes: Uint8Array): void {
    this.reserve(bytes.length);
    this.data.set(bytes, this.length);
    this.length += bytes.length;
  }

  writeUint16(value: number): void {
    this.writeByte(value & 0xff);
    this.writeByte((value >> 8) & 0xff);
  }

  writeAscii(text: string): void {
    for (let i = 0; i < text.length; i++) this.writeByte(text.charCodeAt(i));
  }

  setUint16(offset: number, value: number): void {
    this.data[offset] = value & 0xff;
    this.data[offset + 1] = (value >> 8) & 0xff;
  }

  /** Exactly sized copy of the content. */
  toBytes(): Uint8Array<ArrayBuffer> {
    return this.data.slice(0, this.length);
  }

  private reserve(extra: number): void {
    if (this.length + extra <= this.data.length) return;
    let size = this.data.length * 2;
    while (size < this.length + extra) size *= 2;
    const grown = new Uint8Array(size);
    grown.set(this.data.subarray(0, this.length));
    this.data = grown;
  }
}

/**
 * Writes an animated GIF89a frame by frame. Frames may cover only part of the canvas, and a
 * frame with nothing to draw can be folded into the previous one's delay.
 */
export class GifWriter {
  private readonly buffer = new ByteBuffer();
  private readonly lzw = new LzwEncoder();
  private globalPalette: Uint8Array | null = null;
  /** Byte offset of the last frame's delay field, so it can be extended. */
  private lastDelayOffset = -1;
  private lastDelayCs = 0;
  private frames = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
    /** gifenc convention: 0 loops forever, -1 plays once. */
    private readonly repeat: number,
  ) {}

  get frameCount(): number {
    return this.frames;
  }

  /** Writes a frame and returns the indices a decoder will show for `rect`. */
  writeFrame(frame: GifFrame): Uint8Array {
    const { buffer } = this;
    if (!this.globalPalette) {
      if (!frame.palette) throw new Error('The first GIF frame needs a palette.');
      this.writeHeader(frame.palette);
    }
    const localPalette = this.frames > 0 ? frame.palette : undefined;
    const palette = localPalette ?? (this.globalPalette as Uint8Array);
    const bits = tableBits(palette.length / 3);

    this.writeGraphicControl(frame.delayMs, frame.transparentIndex);

    buffer.writeByte(0x2c); // image separator
    buffer.writeUint16(frame.rect.left);
    buffer.writeUint16(frame.rect.top);
    buffer.writeUint16(frame.rect.width);
    buffer.writeUint16(frame.rect.height);
    if (localPalette) {
      buffer.writeByte(0x80 | (bits - 1));
      this.writeColorTable(localPalette, bits);
    } else {
      buffer.writeByte(0);
    }

    const decoded = this.lzw.encode(
      frame.indices,
      Math.max(2, bits),
      buffer,
      frame.lossy && {
        ...frame.lossy,
        width: frame.rect.width,
        palette,
        transparentIndex: frame.transparentIndex,
      },
    );
    this.frames++;
    return decoded;
  }

  /** Keeps the last frame on screen longer instead of writing an empty frame. */
  extendLastFrame(delayMs: number): void {
    if (this.lastDelayOffset < 0) throw new Error('No GIF frame to extend.');
    this.lastDelayCs = Math.min(MAX_DELAY_CS, this.lastDelayCs + Math.round(delayMs / 10));
    this.buffer.setUint16(this.lastDelayOffset, this.lastDelayCs);
  }

  finish(): Uint8Array<ArrayBuffer> {
    this.buffer.writeByte(0x3b); // trailer
    return this.buffer.toBytes();
  }

  private writeHeader(palette: Uint8Array): void {
    const { buffer } = this;
    const bits = tableBits(palette.length / 3);
    buffer.writeAscii('GIF89a');
    buffer.writeUint16(this.width);
    buffer.writeUint16(this.height);
    // Global color table present, color resolution, table size.
    buffer.writeByte(0x80 | ((bits - 1) << 4) | (bits - 1));
    buffer.writeByte(0); // background color index
    buffer.writeByte(0); // pixel aspect ratio
    this.writeColorTable(palette, bits);
    this.globalPalette = palette;

    if (this.repeat >= 0) {
      buffer.writeByte(0x21); // extension
      buffer.writeByte(0xff); // application extension
      buffer.writeByte(11);
      buffer.writeAscii('NETSCAPE2.0');
      buffer.writeByte(3);
      buffer.writeByte(1);
      buffer.writeUint16(this.repeat);
      buffer.writeByte(0);
    }
  }

  private writeGraphicControl(delayMs: number, transparentIndex: number): void {
    const { buffer } = this;
    const transparent = transparentIndex >= 0;
    buffer.writeByte(0x21); // extension
    buffer.writeByte(0xf9); // graphic control
    buffer.writeByte(4);
    buffer.writeByte((DISPOSE_KEEP_PREVIOUS << 2) | (transparent ? 1 : 0));
    this.lastDelayOffset = buffer.length;
    this.lastDelayCs = Math.min(MAX_DELAY_CS, Math.round(delayMs / 10));
    buffer.writeUint16(this.lastDelayCs);
    buffer.writeByte(transparent ? transparentIndex : 0);
    buffer.writeByte(0);
  }

  private writeColorTable(palette: Uint8Array, bits: number): void {
    const { buffer } = this;
    buffer.writeBytes(palette);
    // Tables are padded to a power of two.
    for (let i = palette.length; i < 3 << bits; i++) buffer.writeByte(0);
  }
}
