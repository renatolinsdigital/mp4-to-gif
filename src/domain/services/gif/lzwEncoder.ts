/** Where encoded bytes go. */
export interface ByteSink {
  writeByte(value: number): void;
  writeBytes(bytes: Uint8Array): void;
}

/**
 * Lets the encoder swap a pixel for a palette color that is close enough, when that makes
 * the current LZW string longer. Longer strings mean fewer codes, which is where the size
 * goes. Colors are compared as they would appear on screen.
 */
export interface LossyMatch {
  /** Largest squared RGB distance accepted for any single pixel. */
  tolerance: number;
  /**
   * Largest squared RGB distance at which a pixel that should change may be left showing
   * what is already on screen. Tighter than `tolerance`: that error stays frame after
   * frame, and lined up along something that moved away it reads as a ghost, not as noise.
   */
  keepTolerance: number;
  /** Pixels per row, so the error carried along a row stops at its end. */
  width: number;
  /** RGB triple per palette index. */
  palette: Uint8Array;
  /** Index drawn as transparent, or -1 when the frame has none. */
  transparentIndex: number;
  /** RGB per pixel of what shows through where the frame is transparent. */
  below: Uint8Array;
  /**
   * RGB per pixel of the true color. A transparent pixel is only swapped for a color close
   * to it, not to what is on screen, so repeated swaps can't drift further every frame.
   */
  source: Uint8Array;
}

const MAX_CODES = 4096;
const MAX_CODE_BITS = 12;
/** GIF data sub-blocks hold at most 255 bytes. */
const BLOCK_SIZE = 255;
/**
 * Share of a swapped pixel's error passed on to the next pixel in the row. The next swap
 * must then also stay within tolerance of the color plus that carried error, so swaps that
 * all lean the same way are cut short. This caps the steady drift along a run at a quarter
 * of the tolerance: the error shows up as fine noise instead of streaks or flattened
 * gradients (like gifsicle's lossy mode).
 */
const CARRY_DECAY = 0.75;

/**
 * GIF-flavored LZW. The dictionary is a trie in flat typed arrays, reused across frames so
 * encoding allocates nothing per frame.
 */
export class LzwEncoder {
  /** Child code for `(code << 8) | symbol`, 0 when absent (code 0 is never a child). */
  private readonly children = new Uint16Array(MAX_CODES << 8);
  private readonly firstChild = new Uint16Array(MAX_CODES);
  private readonly nextSibling = new Uint16Array(MAX_CODES);
  private readonly prefix = new Uint16Array(MAX_CODES);
  private readonly suffix = new Uint8Array(MAX_CODES);
  private readonly block = new Uint8Array(BLOCK_SIZE);
  /** RGB error the last swap left uncorrected, and the pixel it belongs to. */
  private readonly carry = new Float64Array(3);
  private carryAt = -1;

  /**
   * Writes the image data (code size byte, sub-blocks, terminator) for `indices` and returns
   * the indices a decoder will reproduce: `indices` itself, or a new array when `lossy`
   * replaced pixels.
   */
  encode(indices: Uint8Array, minCodeSize: number, out: ByteSink, lossy?: LossyMatch): Uint8Array {
    const { children, firstChild, nextSibling, prefix, suffix, block } = this;
    const clearCode = 1 << minCodeSize;
    const endCode = clearCode + 1;
    const decoded = lossy ? new Uint8Array(indices.length) : indices;

    let codeBits = minCodeSize + 1;
    let nextCode = endCode + 1;
    let bitBuffer = 0;
    let bitCount = 0;
    let blockLength = 0;

    const flushBlock = () => {
      out.writeByte(blockLength);
      out.writeBytes(block.subarray(0, blockLength));
      blockLength = 0;
    };
    const emit = (code: number) => {
      bitBuffer |= code << bitCount;
      bitCount += codeBits;
      while (bitCount >= 8) {
        block[blockLength++] = bitBuffer & 0xff;
        if (blockLength === BLOCK_SIZE) flushBlock();
        bitBuffer >>>= 8;
        bitCount -= 8;
      }
    };
    const resetDictionary = () => {
      // Only entries that were added need clearing, not the whole 1M-slot child table.
      for (let code = endCode + 1; code < nextCode; code++) {
        children[((prefix[code] as number) << 8) | (suffix[code] as number)] = 0;
      }
      firstChild.fill(0, 0, MAX_CODES);
      nextSibling.fill(0, 0, MAX_CODES);
      nextCode = endCode + 1;
      codeBits = minCodeSize + 1;
    };

    out.writeByte(minCodeSize);
    resetDictionary();
    emit(clearCode);
    this.carryAt = -1;

    const length = indices.length;
    let position = 0;
    while (position < length) {
      let code = indices[position] as number;
      let end = position + 1;
      if (lossy) {
        [code, end] = this.matchLossy(indices, position, lossy);
        this.writeString(code, end, clearCode, decoded);
      } else {
        while (end < length) {
          const child = children[(code << 8) | (indices[end] as number)] as number;
          if (!child) break;
          code = child;
          end++;
        }
      }
      emit(code);

      if (end < length) {
        if (nextCode < MAX_CODES) {
          const symbol = indices[end] as number;
          children[(code << 8) | symbol] = nextCode;
          prefix[nextCode] = code;
          suffix[nextCode] = symbol;
          nextSibling[nextCode] = firstChild[code] as number;
          firstChild[code] = nextCode;
          // Codes widen once the new entry no longer fits. The decoder adds each entry one
          // code later than the encoder, which lands its widening on the same code.
          if (nextCode++ >= 1 << codeBits && codeBits < MAX_CODE_BITS) codeBits++;
        } else {
          emit(clearCode);
          resetDictionary();
        }
      }
      position = end;
    }

    // The decoder widens after the last code like after any other, even though no entry
    // follows it, so the end code needs the extra bit when the last code filled the width.
    if (nextCode >= 1 << codeBits && codeBits < MAX_CODE_BITS) codeBits++;
    emit(endCode);
    if (bitCount > 0) {
      block[blockLength++] = bitBuffer & 0xff;
      if (blockLength === BLOCK_SIZE) flushBlock();
    }
    if (blockLength > 0) flushBlock();
    out.writeByte(0);
    // Leaves the child table empty for the next frame.
    resetDictionary();
    return decoded;
  }

  /**
   * Longest dictionary string that reproduces the pixels from `start` within tolerance.
   * Greedy: follows the exact pixel when the trie has it, otherwise the acceptable color
   * that best makes up for the error carried from earlier swaps in the row. The first pixel
   * is always exact, as the decoder requires.
   */
  private matchLossy(indices: Uint8Array, start: number, lossy: LossyMatch): [number, number] {
    const { children, firstChild, nextSibling, suffix, carry } = this;
    const { tolerance, keepTolerance, width, palette, transparentIndex, below, source } = lossy;
    const length = indices.length;
    let code = indices[start] as number;
    let end = start + 1;

    while (end < length) {
      const wanted = indices[end] as number;
      const exact = children[(code << 8) | wanted] as number;
      if (exact) {
        code = exact;
        end++;
        continue;
      }

      // The color the pixel should show: its palette color, or the true color where the
      // frame leaves it unchanged.
      const p = end * 3;
      const w = wanted === transparentIndex ? -1 : wanted * 3;
      const tr = w < 0 ? (source[p] as number) : (palette[w] as number);
      const tg = w < 0 ? (source[p + 1] as number) : (palette[w + 1] as number);
      const tb = w < 0 ? (source[p + 2] as number) : (palette[w + 2] as number);

      // Error left by earlier swaps in this row, fading by CARRY_DECAY per pixel. Exact
      // pixels in between correct nothing, so they only let it fade.
      const sameRow =
        this.carryAt >= 0 && Math.floor(this.carryAt / width) === Math.floor(end / width);
      const decay = sameRow ? CARRY_DECAY ** (end - this.carryAt) : 0;
      const er = (carry[0] as number) * decay;
      const eg = (carry[1] as number) * decay;
      const eb = (carry[2] as number) * decay;

      let best = 0;
      let bestDrift = Infinity;
      let br = 0;
      let bg = 0;
      let bb = 0;
      for (let child = firstChild[code] as number; child; child = nextSibling[child] as number) {
        const symbol = suffix[child] as number;
        const c = symbol === transparentIndex ? -1 : symbol * 3;
        const cr = c < 0 ? (below[p] as number) : (palette[c] as number);
        const cg = c < 0 ? (below[p + 1] as number) : (palette[c + 1] as number);
        const cb = c < 0 ? (below[p + 2] as number) : (palette[c + 2] as number);
        const dr = tr - cr;
        const dg = tg - cg;
        const db = tb - cb;
        // Showing what is already there leaves a pixel that should change as it was, whether
        // through transparency or by repeating the old color. A first frame has nothing below.
        const keeps =
          transparentIndex >= 0 &&
          w >= 0 &&
          cr === below[p] &&
          cg === below[p + 1] &&
          cb === below[p + 2];
        const limit = keeps ? keepTolerance : tolerance;
        if (dr * dr + dg * dg + db * db > limit) continue;
        // Distance from the color plus the carried error: what the neighbors still owe.
        const drift = (dr + er) ** 2 + (dg + eg) ** 2 + (db + eb) ** 2;
        if (drift <= tolerance && drift < bestDrift) {
          bestDrift = drift;
          best = child;
          br = cr;
          bg = cg;
          bb = cb;
        }
      }
      if (!best) break;
      carry[0] = tr + er - br;
      carry[1] = tg + eg - bg;
      carry[2] = tb + eb - bb;
      this.carryAt = end;
      code = best;
      end++;
    }
    return [code, end];
  }

  /**
   * Writes the pixels `code` stands for into `out`, ending just before `end`. Walks from the
   * last pixel back to the root, whose code is the pixel value itself.
   */
  private writeString(code: number, end: number, clearCode: number, out: Uint8Array): void {
    const { prefix, suffix } = this;
    let position = end - 1;
    while (code >= clearCode) {
      out[position--] = suffix[code] as number;
      code = prefix[code] as number;
    }
    out[position] = code;
  }
}
