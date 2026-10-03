// gifenc ships without type definitions. Only the API this app uses is declared: its
// palette quantizer. GIF writing is done by `services/gif/gifWriter.ts`.
declare module 'gifenc' {
  type ColorFormat = 'rgb565' | 'rgb444' | 'rgba4444';
  type PixelData = Uint8Array | Uint8ClampedArray;
  type GifPalette = number[][];

  export function quantize(
    rgba: PixelData,
    maxColors: number,
    options?: { format?: ColorFormat; oneBitAlpha?: boolean | number; clearAlpha?: boolean },
  ): GifPalette;
}
