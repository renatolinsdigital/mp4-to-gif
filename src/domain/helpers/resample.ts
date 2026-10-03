import type { Dimensions } from '@/domain/types/conversion';

const LANCZOS_LOBES = 3;
/** Fixed-point precision of the filter weights. */
const WEIGHT_BITS = 14;
const WEIGHT_ONE = 1 << WEIGHT_BITS;
const ROUNDING = 1 << (WEIGHT_BITS - 1);

interface FilterTable {
  /** First source pixel each output pixel reads. */
  starts: Int32Array;
  /** Source pixels read per output pixel. */
  taps: number;
  /** `taps` fixed-point weights per output pixel, summing to WEIGHT_ONE. */
  weights: Int32Array;
}

function lanczos(x: number): number {
  if (x === 0) return 1;
  if (x <= -LANCZOS_LOBES || x >= LANCZOS_LOBES) return 0;
  const px = Math.PI * x;
  return (LANCZOS_LOBES * Math.sin(px) * Math.sin(px / LANCZOS_LOBES)) / (px * px);
}

/** Lanczos-3 weights for resizing one axis. Pixels past the edge repeat the edge pixel. */
function buildFilter(sourceSize: number, targetSize: number): FilterTable {
  const scale = sourceSize / targetSize;
  // Stretching the kernel by the downscale factor is what removes aliasing.
  const stretch = Math.max(1, scale);
  const support = LANCZOS_LOBES * stretch;
  // The kernel is zero at its ends, so 2 × support taps cover every non-zero weight.
  const taps = Math.min(sourceSize, Math.ceil(support * 2));
  const starts = new Int32Array(targetSize);
  const weights = new Int32Array(targetSize * taps);
  const raw = new Float64Array(taps);

  for (let i = 0; i < targetSize; i++) {
    const center = (i + 0.5) * scale - 0.5;
    const start = Math.min(Math.max(0, Math.floor(center - support) + 1), sourceSize - taps);
    starts[i] = start;
    raw.fill(0);
    let sum = 0;
    for (let j = Math.ceil(center - support); j <= Math.floor(center + support); j++) {
      const weight = lanczos((j - center) / stretch);
      const k = Math.min(Math.max(j, 0), sourceSize - 1) - start;
      const slot = Math.min(Math.max(k, 0), taps - 1);
      raw[slot] = (raw[slot] as number) + weight;
      sum += weight;
    }

    let fixedSum = 0;
    let largest = 0;
    for (let k = 0; k < taps; k++) {
      const fixed = Math.round(((raw[k] as number) / sum) * WEIGHT_ONE);
      weights[i * taps + k] = fixed;
      fixedSum += fixed;
      if (fixed > (weights[i * taps + largest] as number)) largest = k;
    }
    // Rounding drift goes to the biggest weight so flat areas keep their exact color.
    weights[i * taps + largest] = (weights[i * taps + largest] as number) + WEIGHT_ONE - fixedSum;
  }
  return { starts, taps, weights };
}

const clampByte = (value: number) => (value < 0 ? 0 : value > 255 ? 255 : value);

/**
 * Downscales RGBA frames with a Lanczos-3 filter. The browser's own `drawImage` scaling of
 * video frames is plain bilinear, which aliases (broken thin lines, shimmering detail)
 * past 2× and softens below it. Lanczos keeps edges crisp without aliasing.
 *
 * Built once per size pair and reused for every frame, so the filter tables are computed once.
 */
export class Resampler {
  private readonly horizontal: FilterTable;
  private readonly vertical: FilterTable;
  /**
   * Horizontally filtered pixels packed as 0x00BBGGRR, stored transposed so the vertical
   * pass reads them in order.
   */
  private readonly columns: Uint32Array;

  constructor(
    readonly source: Dimensions,
    readonly target: Dimensions,
  ) {
    this.horizontal = buildFilter(source.width, target.width);
    this.vertical = buildFilter(source.height, target.height);
    this.columns = new Uint32Array(target.width * source.height);
  }

  resize(rgba: Uint8ClampedArray): Uint8ClampedArray {
    this.filterRows(rgba);
    return this.filterColumns();
  }

  private filterRows(rgba: Uint8ClampedArray): void {
    const { starts, taps, weights } = this.horizontal;
    const { columns } = this;
    // One 32-bit read per pixel instead of three byte reads (RGBA is little-endian ABGR).
    const pixels = new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.length >> 2);
    const sourceWidth = this.source.width;
    const sourceHeight = this.source.height;
    const targetWidth = this.target.width;

    for (let y = 0; y < sourceHeight; y++) {
      const row = y * sourceWidth;
      for (let x = 0; x < targetWidth; x++) {
        let r = ROUNDING;
        let g = ROUNDING;
        let b = ROUNDING;
        let s = row + (starts[x] as number);
        let w = x * taps;
        for (let k = 0; k < taps; k++, s++, w++) {
          const weight = weights[w] as number;
          const pixel = pixels[s] as number;
          r += (pixel & 0xff) * weight;
          g += ((pixel >> 8) & 0xff) * weight;
          b += ((pixel >> 16) & 0xff) * weight;
        }
        columns[x * sourceHeight + y] =
          clampByte(r >> WEIGHT_BITS) |
          (clampByte(g >> WEIGHT_BITS) << 8) |
          (clampByte(b >> WEIGHT_BITS) << 16);
      }
    }
  }

  private filterColumns(): Uint8ClampedArray {
    const { starts, taps, weights } = this.vertical;
    const { columns } = this;
    const sourceHeight = this.source.height;
    const { width, height } = this.target;
    const output = new Uint8ClampedArray(width * height * 4);

    for (let x = 0; x < width; x++) {
      const column = x * sourceHeight;
      for (let y = 0; y < height; y++) {
        let r = ROUNDING;
        let g = ROUNDING;
        let b = ROUNDING;
        let s = column + (starts[y] as number);
        let w = y * taps;
        for (let k = 0; k < taps; k++, s++, w++) {
          const weight = weights[w] as number;
          const pixel = columns[s] as number;
          r += (pixel & 0xff) * weight;
          g += ((pixel >> 8) & 0xff) * weight;
          b += (pixel >> 16) * weight;
        }
        const out = (y * width + x) * 4;
        // Uint8ClampedArray clamps the overshoot Lanczos produces next to hard edges.
        output[out] = r >> WEIGHT_BITS;
        output[out + 1] = g >> WEIGHT_BITS;
        output[out + 2] = b >> WEIGHT_BITS;
        output[out + 3] = 255;
      }
    }
    return output;
  }
}

/**
 * Sizes to step a video frame down through before the Lanczos pass. Drawing at exactly half
 * size is a plain 2×2 average in the browser, cheap and alias-free, so the frame is halved
 * while it stays at least as large as the target. Lanczos then covers the last factor
 * below 2, which keeps its cost low. Empty when the frame is used at its own size.
 */
export function halvingSteps(source: Dimensions, target: Dimensions): Dimensions[] {
  const steps: Dimensions[] = [];
  let { width, height } = source;
  while (Math.round(width / 2) >= target.width && Math.round(height / 2) >= target.height) {
    width = Math.round(width / 2);
    height = Math.round(height / 2);
    steps.push({ width, height });
  }
  return steps;
}
