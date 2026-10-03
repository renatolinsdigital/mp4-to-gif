# Techniques

Engineering techniques used outside the pixel pipeline: concurrency, memory, async state, validation, accessibility, and content. Encoder techniques (Lanczos resizing, dithering, pixel skipping, lossy compression) are covered in [Encoding](encoding.md).

Each entry names the problem, the approach, and where to find it in the code. Paths are relative to `src/domain/` unless they say otherwise.

## Concurrency and memory

### Encoding in a worker

- **Problem:** quantizing, dithering, and compressing a 1080p frame takes long enough to freeze the page.
- **Approach:** all of it runs in a module Web Worker. The main thread only seeks the video and reads pixels. `GifEncodingSession` has no worker-specific code, so tests call it directly.
- **Where:** `services/gif/gifEncoder.worker.ts`, `gifEncoderClient.ts`, `gifEncodingSession.ts`.

### A promise-based message protocol

- **Problem:** `postMessage` is fire-and-forget, which makes ordering, errors, and cancellation hard to reason about.
- **Approach:** requests and replies are discriminated unions. Each request carries an incrementing `id`, and the client keeps a map of pending promises, settling the matching one when the reply arrives. Errors cross the boundary as `{ code, message }` and become a `ConversionError` again on the main thread.
- **Where:** `services/gif/gifEncoderProtocol.ts`, `gifEncoderClient.ts`.

### Zero-copy transfers

- **Problem:** a 1080p RGBA (red, green, blue, alpha) frame is 8.3 MB, and a finished GIF (Graphics Interchange Format) file can pass 100 MB. Copying them between threads costs time and doubles peak memory.
- **Approach:** frame buffers and palette samples are posted as transferables, so ownership moves to the worker without a copy. The finished GIF comes back the same way, and the worker slices a copy only if the bytes don't fill their buffer exactly.
- **Where:** `encodeFrame` and `setPaletteSamples` in `gifEncoderClient.ts`, and the `finish` case in `gifEncoder.worker.ts`.

### Backpressure

- **Problem:** capturing frames faster than the worker encodes them piles raw frames up in memory. Waiting for each frame to finish before capturing the next leaves both threads idle half the time.
- **Approach:** up to 3 frames are in flight. Once 3 are queued, the capture loop waits for the oldest to finish, so decoding and encoding overlap while memory stays bounded.
- **Where:** `MAX_FRAMES_IN_FLIGHT` in `services/gifConversion.service.ts`.

### Checking the memory budget up front

- **Problem:** the finished GIF stays in memory until downloaded. A long Full HD clip could exhaust the tab halfway through, after minutes of work.
- **Approach:** a plan whose `width × height × frames` exceeds 1.2 billion is refused before it starts. The settings panel disables Convert and says how many seconds fit at the current size, frame rate, and speed. Allocation failures that get through anyway are still reported as `insufficient-memory` rather than a generic failure.
- **Where:** `exceedsMemoryBudget` and `maxSecondsWithinBudget` in `helpers/conversionPlan.ts`, and `components/SettingsPanel/SettingsPanel.tsx`.

### Releasing media resources

- **Problem:** browsers keep a video's decoding pipeline alive until its `src` is cleared, and a canvas holds its pixel memory until it's resized.
- **Approach:** `releaseVideo` pauses the video, removes `src`, and calls `load()`. The frame extractor resizes its canvases to 0×0 when disposed. Both run in `finally` blocks, so they also run after errors and cancellation.
- **Where:** `services/video/mediaEvents.ts`, `frameExtractor.service.ts`, `videoProbe.service.ts`.

### Object URL lifecycle

- **Problem:** every object URL (Uniform Resource Locator) made by `URL.createObjectURL` keeps its `Blob` in memory until it's revoked.
- **Approach:** removing or replacing a file revokes its source, poster, and result URLs. A new GIF revokes the previous one's URL. A thumbnail that arrives after its file was replaced is revoked on arrival.
- **Where:** `revokeJobUrls`, `loadFile`, and `convert` in `hooks/useGifConverter.ts`.

## Async state

### Cancellation with one signal

- **Problem:** a conversion spans seeks on the main thread and work in the worker. Cancel has to stop both, promptly.
- **Approach:** one `AbortController` per conversion. Its signal rejects any pending media wait, the capture loop checks it between frames, and an abort listener terminates the worker, which rejects every pending request. Any error raised after an abort is reported as `cancelled`, whatever caused it.
- **Where:** `convertToGif` in `services/gifConversion.service.ts`, `waitForMediaEvent` in `mediaEvents.ts`, and `dispose` in `gifEncoderClient.ts`.

### Stale async results

- **Problem:** probing and converting are async. If the user replaces the file midway, the old work can finish later and overwrite the new file's state.
- **Approach:** each job gets an id from `crypto.randomUUID()`. Every action dispatched by async work carries the id it started with, and the reducer's `updateJob` ignores actions for any other id. The hook also mirrors the latest state in a ref, so async callbacks read current state instead of the copy from the render that started them, and it updates that ref synchronously when a file is loaded, so a quick replace sees the new job immediately.
- **Where:** `helpers/converterReducer.ts`, `hooks/useGifConverter.ts`.

### Keeping the last good result

- **Problem:** cancelling a second conversion shouldn't throw away the GIF the first one produced.
- **Approach:** a cancelled job returns to `completed` if it already has a result, and to `ready` otherwise. Only a successful conversion replaces the result.
- **Where:** the `conversionCancelled` case in `helpers/converterReducer.ts`.

### Conversions that survive navigation

- **Problem:** state held inside the converter page would be lost the moment the user opened the docs mid-conversion.
- **Approach:** `ConverterProvider` wraps the router, so the job, the settings, and any running conversion live above the pages.
- **Where:** `src/app/App.tsx`, `components/ConverterProvider/ConverterProvider.tsx`.

### Throttled, monotonic progress

- **Problem:** a progress event per frame would re-render the settings panel dozens of times a second.
- **Approach:** progress dispatches are throttled to one per 100 ms, except the final 100%. Progress only moves forward: the shared-palette phase fills the first 8%, frame encoding fills up to 98%, and writing the file completes it.
- **Where:** `PROGRESS_THROTTLE_MS` in `hooks/useGifConverter.ts`, `PALETTE_PHASE_SHARE` in `services/gifConversion.service.ts`.

## Validation and errors

### File type by content, not by name

- **Problem:** a renamed file passes an extension check and then fails confusingly later.
- **Approach:** two stages. A cheap check on name and Multipurpose Internet Mail Extensions (MIME) type filters dropped files. Then the first 12 bytes are read, and bytes 4 to 8 must be a top-level MP4 box type: `ftyp`, `moov`, `mdat`, `free`, `skip`, `wide`, or `pnot`. Most files start with `ftyp`, but some recorders write other boxes first.
- **Where:** `helpers/fileValidation.ts`.

### Catching unsupported codecs at import

- **Problem:** a file whose codec the browser can't decode would only fail mid-conversion.
- **Approach:** the probe decodes a real frame for the thumbnail, not just the metadata. It seeks a quarter of the way in, capped at 1 second, to skip the black or fade-in frame many videos open with. A file whose metadata reports no picture size has no decodable video track and is flagged right away.
- **Where:** `services/video/videoProbe.service.ts`.

### Typed error codes

- **Problem:** errors come from many places: media elements, `DOMException`s, failed allocations, and the worker.
- **Approach:** one `ConversionError` class with a closed set of codes, each with a message that tells the user what to change. Mapping functions turn everything else into one of those codes. See [Architecture](architecture.md#error-model).
- **Where:** `helpers/conversionErrors.ts`.

### Schema validation for typed input

- **Problem:** text fields produce strings, and the plan needs numbers in range.
- **Approach:** Zod schemas coerce and validate the custom width (whole pixels from 16 to 3840) and the section (non-negative, end after start), returning messages shown inline next to the field.
- **Where:** `helpers/settingsSchema.ts`.

## Single sources of truth

### One plan for the preview and the conversion

The output summary, the memory warning, and the conversion itself all call `buildConversionPlan`. The user interface (UI) can't promise dimensions, frame counts, or durations the encoder won't produce.

### Docs generated from constants

The in-app `/docs` page and the Home page preset table read preset values, thresholds, tolerances, limits, and memory figures from the encoder's own constants. The comment at the top of `helpers/docsContent.ts` states the rule: the docs can't drift from what the converter does.

## UI and accessibility

### Focus after navigation

Client-side navigation doesn't move focus, which leaves keyboard and screen reader users at the link they just used. `AppLayout` focuses `<main>` and scrolls to the top on every route change after the first render. A skip link jumps straight to the content.

### Search state in the URL

The docs search query lives in `?q=`. Updates use `replace`, so typing doesn't add one history entry per keystroke, and `preventScrollReset`, so the page doesn't jump. A search can be shared or bookmarked. Pressing `/` focuses the search field.

Search requires every term to match, and ranks entries by where each term hits: title (10 points), keywords (6), summary (3), anything else (1). Text is lowercased, accents are stripped, curly apostrophes are straightened, and `×` is treated as `x`, so "1920x1080" finds "1920×1080".

### A theme that follows the system

Colors are CSS (Cascading Style Sheets) custom properties, and Sass variables point at them. The theme follows the operating system until the user picks one, and that choice is stored in `localStorage`. Storage access is wrapped in `try`/`catch`, since private browsing and strict settings can block it. If storage fails, the chosen theme still applies for the visit.

### Lazy routes with layered error boundaries

Each page is a separate chunk, loaded on first visit. The error page is imported eagerly, because it has to render when a page chunk is what failed to load (for example, after a deploy replaced the chunk files). Page errors render inside the layout, so the header and navigation keep working.

### Self-hosted fonts

Fonts are installed from npm and bundled, so the app makes no request to a third-party font service. That's a privacy decision as much as a performance one.

## Testing the encoder by decoding it

The test suite includes a minimal GIF decoder that composites frames the way a viewer does: frame rectangles, transparency, and "do not dispose". Encoder tests assert on the decoded image, which lets them check visual properties directly, such as "a faint line that moves away leaves no trace behind". See [Testing](testing.md#testing-the-encoder).
