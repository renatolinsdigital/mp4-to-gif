# Performance

Where time and memory go during a conversion, what's been done about it, and how to measure changes. The general rules in `.claude/engineering/performance.md` apply: measure before optimizing, prefer removing work to speeding it up, and put before and after numbers in the pull request.

## Where the time goes

A conversion runs on two threads at once:

| Thread | Work per frame                                                                                                                  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Main   | Seek the hidden video, wait for the decoded frame, draw it through the halving chain, read pixels with `getImageData`           |
| Worker | Lanczos resize, palette check (and rebuild when needed), pixel mapping with dithering and skip decisions, crop, compress, write |

What the code itself says about cost (these are design notes, not benchmarks):

- Seeking is slower than playing, but it's frame-accurate and doesn't depend on real-time playback. It's the main cost on the main thread.
- Quantizing a palette is the slowest step in the worker. Adaptive palettes avoid it on most frames by reusing the current palette until it stops fitting.
- Diffusion dithering is slower than ordered dithering, and because its pattern shifts every frame, fewer pixels can be skipped.
- Cost scales with pixel count: width × height × frames. Doubling the width roughly quadruples the work and the file size.

Encoding is sequential by nature. Each frame's skip and lossy decisions depend on what earlier frames left on screen, and an adaptive palette depends on the one before it. That's why there's one encoder worker, not a pool.

## What keeps it fast

### Overlapping capture and encoding

Up to 3 frames are in flight (`MAX_FRAMES_IN_FLIGHT`). While the worker encodes one frame, the main thread is already seeking to the next.

### Less work per frame

- **Halving before Lanczos.** The browser halves frames with `drawImage`, a cheap 2×2 average, while they're still at least twice the output size. Lanczos then only handles the last step, which keeps its kernel small.
- **Skipped seeks.** A seek to the time the video is already at is skipped, so the repeated frames of slow motion cost almost nothing to capture.
- **Partial frames.** Only the changed rectangle is compressed and written.
- **Merged frames.** A frame with no changes costs a 2-byte patch to the previous frame's delay.
- **Capped palette input.** Shared palettes are built from at most 500,000 pixels, whatever the clip's length or size.
- **Sampled palette checks.** Testing whether an adaptive palette still fits reads at most 8,192 pixels.

### Cheap inner loops

- **Typed arrays throughout.** Pixels, screen state, filter weights, and the compression dictionary are flat typed arrays, never objects or nested arrays.
- **Nearest-color cache.** A 65,536-entry table per palette, keyed by the color at RGB565 precision (5 bits red, 6 green, 5 blue). Most lookups are one array read.
- **Integer Lanczos.** Weights are 14-bit fixed point, each pixel is read as one 32-bit integer, and the intermediate buffer is stored transposed so the vertical pass reads memory in order.
- **Direct-indexed dictionary.** The Lempel-Ziv-Welch (LZW) dictionary finds a child with `children[(code << 8) | symbol]` instead of a hash map lookup. The 2 MB table is allocated once per conversion and cleared by touching only the entries that were set.
- **Precomputed tables.** Lanczos weights are built once per size pair, and the Bayer matrix is a constant.

### Fewer re-renders

- Progress updates are throttled to one per 100 ms.
- Components aren't memoized by default, per `.claude/engineering/react.md`. Add memoization only when the profiler shows a real problem.

## Memory budget

The finished GIF (Graphics Interchange Format) file stays in memory until it's downloaded. To avoid running out halfway through, a plan is refused up front when:

```text
output width × output height × frame count > 1,200,000,000
```

For 16:9 video at 1× speed, that allows:

| Preset   | Output      | FPS | Longest GIF          |
| -------- | ----------- | --- | -------------------- |
| Compact  | 480 × 270   | 10  | 925 s (about 15 min) |
| Standard | 720 × 405   | 10  | 411 s (about 7 min)  |
| Smooth   | 720 × 405   | 20  | 205 s                |
| HD       | 1280 × 720  | 24  | 54 s                 |
| Full HD  | 1920 × 1080 | 30  | 19 s                 |

FPS is frames per second. Speed scales these limits: at 2× twice as much video fits, because the GIF is half as long. Slow motion fits less.

The budget is a conservative cap chosen to keep conversions from crashing, not a measured limit for every device. Devices with little memory can still fail below it. When that shows up as a failed allocation, it's reported as `insufficient-memory`. When the browser kills the tab instead, nothing can report it.

### Other memory during a Full HD conversion

Approximate sizes, worked out from the array sizes in the code:

| Item                                                             | Size                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| One 1920 × 1080 RGBA frame (4 bytes per pixel)                   | 8.3 MB                                                                            |
| Frames in flight (up to 3 queued, plus the one being captured)   | about 33 MB                                                                       |
| Screen state in the worker (`displayed`, `reference`, `average`) | 18.7 MB                                                                           |
| LZW dictionary tables                                            | about 2.1 MB                                                                      |
| Nearest-color cache, per palette                                 | 128 KB                                                                            |
| Output buffer                                                    | Doubles as it grows, so up to 2× the GIF size, plus an exact-size copy at the end |

RGBA is red, green, blue, and alpha.

## Bundle size

Measured with `npm run build` on 2026-10-03:

| Chunk                                                                     | Size     | Gzip     |
| ------------------------------------------------------------------------- | -------- | -------- |
| `index`: the entry chunk (React, React DOM, React Router, Zod, app shell) | 397.7 kB | 125.7 kB |
| `DocsPage`                                                                | 30.3 kB  | 11.5 kB  |
| `gifEncoder.worker`                                                       | 22.6 kB  | n/a      |
| `ConverterPage`                                                           | 20.0 kB  | 6.8 kB   |
| `DonatePage`, including the PayPal logo artwork                           | 11.8 kB  | 5.1 kB   |
| `jsx-runtime`                                                             | 8.8 kB   | 3.3 kB   |
| `HomePage`                                                                | 6.2 kB   | 2.1 kB   |
| `TextField`, shared by the converter and donate pages                     | 2.4 kB   | 1.0 kB   |
| `formatters`, shared by the converter and docs pages                      | 0.7 kB   | 0.4 kB   |
| `NotFoundPage`                                                            | 0.4 kB   | 0.3 kB   |
| CSS, all chunks                                                           | 67.0 kB  | 16.6 kB  |
| Fonts, all subsets (WOFF2)                                                | 295 kB   | n/a      |

CSS is Cascading Style Sheets. WOFF2 is Web Open Font Format 2, which is already compressed. Vite doesn't report gzip sizes for the worker or the fonts.

Worth knowing:

- **Zod is in the entry chunk.** `ConverterProvider` wraps the whole app, and through the reducer it imports `DEFAULT_SETTINGS` from `settingsSchema.ts`, the same module that defines the Zod schemas. Moving the defaults to their own module could let Zod load with the converter page instead. Measure before and after if you try it.
- **The worker downloads on first use.** It's fetched when the first conversion creates it, not on page load.
- **Fonts download by subset.** Each font file covers a character range, and browsers only fetch the ranges a page uses, usually the two Latin files (130.5 kB together).
- **Pages are lazy.** Visiting Home doesn't download the converter or the docs content.
- **Anything the app shell can reach lands in `index`,** even when only one lazy page uses it. Two cases so far, both from the donate page. `PayPalLogo` isn't exported from the `@/shared/icons` barrel, because the header imports that barrel, and the logo artwork would load on every page (about 5 kB). The donation amount schema avoids `z.string()`, which would pull every Zod string format (email, web address, unique ID, and more) into `index` (about 17 kB). After adding an export to a barrel or a new kind of Zod schema, check that `index` didn't grow.

## Test suite speed

On 2026-10-03, `npm test` ran 244 tests in 45 files in about 5.9 seconds. Vitest reported that creating the jsdom environment took about 66% of tracked time, since it's created once per test file. Vitest suggests `pool: 'vmThreads'` or `isolate: false` to reduce that. Neither is enabled. Both change how test files are isolated from each other, so measure and check for leaking state before adopting one.

## How to measure

- **Conversion time:** record a profile in the browser's developer tools while converting a fixed clip with a fixed preset. The worker shows up as its own thread. Compare the same clip, preset, and machine before and after.
- **Output size:** the result panel shows the exact byte size. For encoder changes, also compare sizes in a unit test with `GifEncodingSession` and synthetic frames, which is repeatable across machines.
- **Memory:** take heap snapshots, or watch the browser's task manager, during a long Full HD conversion.
- **Bundle:** `npm run build` prints every chunk with its gzip size. Compare before and after adding a dependency.

For a repeatable test clip, generate one with FFmpeg. See [Development](development.md#test-videos).

## Ideas not yet explored

None of these have been measured. They're candidates if conversion speed or memory becomes a problem:

- **WebCodecs `VideoDecoder`** would decode frames in order instead of seeking for each one, and could run inside a worker. It needs an MP4 demuxer, since the `<video>` element does that part today.
- **`OffscreenCanvas` in the worker** for the halving chain, moving more work off the main thread.
- **Streaming the output to disk** with the File System Access API, which would lift the memory budget in browsers that support it.
- **Parallel palette building** for shared palettes. Encoding must stay sequential, but quantizing the sample frames doesn't depend on screen state.
- **Moving Zod out of the entry chunk**, as described under [Bundle size](#bundle-size).
