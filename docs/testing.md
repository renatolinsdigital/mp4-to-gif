# Testing

How the test suite is organized, how the encoder is tested, and what still needs a manual check. The rules come from `.claude/engineering/testing.md`: test behavior rather than implementation, give every component a render test and a behavior test, and add a regression test with every bug fix.

## Running tests

```bash
npm test                # single run
npm run test:watch      # watch mode
npm run test:coverage   # with a coverage report in coverage/
```

The pre-commit hook runs the full suite. On 2026-10-03 there were 222 tests in 42 files, and a run took about 6 seconds.

## Setup

Vitest is configured in `vite.config.ts`, under `test`:

- **Environment:** jsdom.
- **Setup file:** `src/tests/setup.ts` registers the jest-dom matchers and runs Testing Library's `cleanup` after each test. Vitest runs without globals, so tests import `describe`, `test`, and `expect` from `vitest`.
- **CSS Modules:** class names stay unscoped (`classNameStrategy: 'non-scoped'`), so a test can check that `styles.active` was applied by looking for an `active` class. CSS is Cascading Style Sheets.
- **Coverage:** V8 coverage over `src/**/*.{ts,tsx}`, excluding test files, `src/tests/`, and `main.tsx`.

## Layout

Tests sit next to the code they cover, as in `Button.tsx` and `Button.test.tsx`. Shared test code lives in `src/tests/`:

| File            | Purpose                                                            |
| --------------- | ------------------------------------------------------------------ |
| `setup.ts`      | Global setup: matchers and cleanup                                 |
| `fixtures.ts`   | `makeJob()` and `makeGifResult()` builders with sensible defaults  |
| `gifDecoder.ts` | A minimal GIF decoder for checking what the encoder's output shows |

GIF is Graphics Interchange Format.

Test names read as sentences that state a behavior, for example "a frame identical to the previous one extends its delay instead of being stored". Tests follow Arrange, Act, Assert.

## What's covered

| Area           | Examples                                                                                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Planning       | Aspect ratio, never upscaling, section clamping, delays that add up exactly, speed, the memory budget                                                                                     |
| Encoder        | Compression round trips at every input length, lossy tolerance and error balancing, palette rebuilds, changed rectangles, merged frames, no ghosts, Lanczos on flat colors and hard edges |
| Domain helpers | File signature checks, error mapping, file naming, reducer transitions, docs search ranking                                                                                               |
| Components     | Every shared and domain component renders and responds to interaction                                                                                                                     |
| Pages          | Home, Converter, Docs, Not Found, and the route error page                                                                                                                                |
| Hooks          | Theme and keyboard shortcut hooks                                                                                                                                                         |

## Testing the encoder

`src/tests/gifDecoder.ts` parses a GIF and composites each frame the way a viewer does: frame rectangles, transparency, and "do not dispose". `decodeGif(bytes)` returns each frame's rectangle, delay, and raw indices, and, most usefully, `canvas`: the full red, green, and blue image on screen after that frame.

That makes it possible to test what a person would see, not which bytes were written:

```ts
import { expect, test } from 'vitest';

import { resolveEncoding } from '@/domain/helpers/qualityPresets';
import { GifEncodingSession } from '@/domain/services/gif/gifEncodingSession';
import { decodeGif } from '@/tests/gifDecoder';

test('a still scene is stored once, then its delay grows', () => {
  const width = 16;
  const height = 16;
  const frame = new Uint8ClampedArray(width * height * 4).fill(200);
  const session = new GifEncodingSession({ width, height, repeat: 0, ...resolveEncoding('high') });

  session.addFrame(frame, 100);
  session.addFrame(frame, 100);

  const gif = decodeGif(session.finish());
  expect(gif.frames).toHaveLength(1);
  expect(gif.frames[0]?.delayCs).toBe(20);
  expect(gif.frames[0]?.canvas[0]).toBe(200);
});
```

The second frame matches the first, so it's merged into it: one stored frame showing for 20 centiseconds.

Guidelines for encoder tests:

- Use small synthetic frames, a few dozen pixels on a side. Gradients, solid colors, and a single moving line cover most cases.
- Assert on `canvas` for what viewers see, on `rect`, `delayCs`, and frame counts for structure, and on byte length only relatively ("smaller than lossless"), never as an exact number.
- Check behavior that every preset must share with `describe.each(QUALITY_PRESET_ORDER)`.
- For lossy or dithered output, assert on bounds (each pixel within the tolerance) rather than exact colors.

## What isn't covered automatically

jsdom has no media pipeline and no real workers, so these modules have no unit tests:

| Module                                                                                | Needs                                                 |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `services/video/frameExtractor.service.ts`, `videoProbe.service.ts`, `mediaEvents.ts` | A real `<video>` element that decodes and seeks       |
| `services/gif/gifEncoderClient.ts`, `gifEncoder.worker.ts`                            | A real Web Worker                                     |
| `services/gifConversion.service.ts`                                                   | Both of the above                                     |
| `hooks/useGifConverter.ts`                                                            | The services above. Its reducer is tested on its own. |

These paths are relative to `src/domain/`. The modules are kept thin on purpose, and the logic they call (the session, the plan, the reducer, the error mapping) is tested. They still need a manual pass whenever they change.

## Manual checklist

Before merging changes to conversion, the worker, or media handling, check in a real browser:

- [ ] An H.264 clip converts with each preset, and the GIF plays correctly.
- [ ] A section and a speed other than 1× produce the length the output summary predicted.
- [ ] Cancelling mid-conversion returns to the previous state, and converting again afterward works.
- [ ] Navigating to Docs and back during a conversion leaves it running.
- [ ] Removing the file during analysis or conversion, then adding another, shows only the new file's state.
- [ ] A High Efficiency Video Coding (HEVC) clip, in a browser that can't decode it, shows the unsupported encoding message as soon as it's added.
- [ ] A renamed file that isn't an MP4 shows the invalid file message.
- [ ] A clip over the memory budget disables Convert and says how many seconds fit.
- [ ] Keyboard only: the drop zone, settings, Convert, download, and theme toggle all work, with visible focus.
- [ ] At phone width, nothing scrolls sideways and every control is usable.

[Development](development.md#test-videos) shows how to generate test clips with FFmpeg.
