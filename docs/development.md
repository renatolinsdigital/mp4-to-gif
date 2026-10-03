# Development

How to set up, run, and change the project. Coding conventions live in `.claude/`, mapped out in [`CLAUDE.md`](../CLAUDE.md). This document covers the practical side.

## Prerequisites

- **Node.js 22 (22.22.1 or later) or Node.js 24.** lint-staged, React Router, and Vitest set this floor. Node.js 25 falls outside Vitest's supported range.
- **npm.** The repository has a `package-lock.json`, so use npm rather than another package manager.
- **A current Chromium-based browser, Firefox, or Safari** for manual testing.
- **FFmpeg** (optional), for generating test videos.

## Setup

```bash
npm install
npm run dev
```

`npm install` also runs the `prepare` script, which installs the Husky Git hooks. The dev server starts at `http://localhost:5173` by default.

## Scripts

| Command                 | What it does                                                   |
| ----------------------- | -------------------------------------------------------------- |
| `npm run dev`           | Vite dev server with hot module replacement                    |
| `npm run build`         | Type check with `tsc -b`, then build for production to `dist/` |
| `npm run preview`       | Serve the production build locally                             |
| `npm run typecheck`     | Type check only                                                |
| `npm run lint`          | ESLint over the whole project                                  |
| `npm run format`        | Format everything with Prettier                                |
| `npm run format:check`  | Check formatting without writing                               |
| `npm test`              | Run the test suite once                                        |
| `npm run test:watch`    | Run tests in watch mode                                        |
| `npm run test:coverage` | Run tests with a coverage report in `coverage/`                |

## Commit hooks

`.husky/pre-commit` runs on every commit:

1. `lint-staged`: ESLint with `--fix`, then Prettier, on staged `.ts` and `.tsx` files. Prettier on staged `.scss`, `.json`, `.md`, and `.html` files.
2. `npm run typecheck`.
3. `npm test`, the full suite.

A failure in any step blocks the commit. Fix the cause rather than skipping the hook with `--no-verify`.

## Git workflow

The full rules are in `.claude/workflow/git.md` and `.claude/workflow/pull-requests.md`. In short:

- The default branch is `master`.
- Name branches by intent: `feature/short-description`, `fix/short-description`, `chore/short-description`, or `refactor/short-description`.
- Write commit messages as Conventional Commits: `feat:`, `fix:`, `docs:`, `perf:`, `refactor:`, `test:`, `chore:`.
- Pull request descriptions cover what changed and why, how it was tested, and a screenshot or short clip for visual changes. Performance changes include before and after measurements.

## Where code goes

| You're adding                                                  | Put it in                                                                                         |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A reusable, presentation-only component                        | `src/shared/components/Name/`                                                                     |
| A component that knows about videos, settings, or GIFs         | `src/domain/components/Name/`                                                                     |
| Logic worth testing on its own, with no media or worker access | `src/domain/helpers/`                                                                             |
| Code that talks to `<video>`, a canvas, or the worker          | `src/domain/services/`                                                                            |
| State and side effects for part of the interface               | A hook in `src/domain/hooks/` or `src/shared/hooks/`                                              |
| A page                                                         | `src/pages/Name/`, plus a lazy route in `src/routes/router.tsx` and a nav item in `AppLayout.tsx` |

GIF is Graphics Interchange Format.

Each component folder holds `Name.tsx`, `Name.module.scss`, `Name.test.tsx`, and an `index.ts` that re-exports the component. `.claude/examples/components.md` has a reference to copy.

Import through the `@/` alias. Group imports with packages first, then `@/` paths, then relative imports (usually just the component's own `./Name.module.scss`), separated by blank lines.

## Common tasks

### Change a preset

Edit `QUALITY_PRESETS` in `src/domain/helpers/qualityPresets.ts`. The Home page table, the preset hints, and the in-app docs read from it, so they update on their own. Check that the preset's `summary` text still describes it, then run the tests, since several pin preset behavior.

### Add a fine-tune setting

1. In `src/domain/types/conversion.ts`, add the option type, an optional field in `QualityTuning`, and the resolved value in `EncodingParams`.
2. In `qualityPresets.ts`, add the field to `QualityPresetConfig` and to every preset, resolve it in `resolveEncoding`, and compare it in `isTuned`.
3. Add a control to `QualityTuningFields`.
4. Use the value in `GifEncodingSession` or the helpers it calls.
5. Add a docs entry in `docsContent.ts` that reads its numbers from constants, and a Home page column if the setting differs by preset.
6. Test the encoder change by decoding its output. See [Testing](testing.md#testing-the-encoder).

### Change the encoder

Read [Encoding](encoding.md) first. Then:

- Write or adjust a test against `GifEncodingSession` with synthetic frames, and assert on decoded pixels.
- Compare output size on the same input before and after.
- Look at decoded frames, and at real GIFs in a browser, for ghosts, streaks, and banding. A smaller file with structured artifacts is a regression.

### Add a docs entry

Add it to `DOCS_SECTIONS` in `src/domain/helpers/docsContent.ts`. Give it a stable `id`, since it becomes the anchor in `/docs#id` and other entries link to it through `related`. Write a one-sentence `summary`, and add `keywords` for words people might search for that aren't in the text. Read any number from the constant that defines it, never retype it.

## Debugging

- **The worker** shows up as its own thread in the browser's developer tools. You can set breakpoints in `gifEncoder.worker.ts` and the encoder files from the Sources panel.
- **Worker errors** arrive on the main thread as `ConversionError` codes, and a crash shows up as `conversion-failed`. To see the original error, log it in the worker's `catch` block before `toConversionError` runs, and remove the log before committing.
- **Stuck conversions** time out after 20 seconds per seek and report a corrupted file. If a file always stops at the same point, play it in a desktop player and check its codec.
- **Visual problems** are easiest to pin down in a unit test. Build frames that show the issue, encode them with `GifEncodingSession`, and inspect `decodeGif(bytes).frames[i].canvas`.

## Test videos

FFmpeg can generate repeatable clips with motion, gradients, and fine detail:

```bash
# H.264, 1080p, 30 FPS, 5 seconds: plays in every browser
ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 5 -c:v libx264 -pix_fmt yuv420p h264-1080p.mp4

# HEVC: exercises the unsupported encoding message in browsers that can't decode it
ffmpeg -f lavfi -i testsrc2=size=1920x1080:rate=30 -t 5 -c:v libx265 -tag:v hvc1 -pix_fmt yuv420p hevc-1080p.mp4

# Not a video at all, with an .mp4 name: exercises the content check
cp README.md not-a-video.mp4
```

FPS is frames per second, and HEVC is High Efficiency Video Coding (H.265).

Real footage matters too. Keep a few clips around: a screen recording (flat colors, sharp text), a camera clip with sky or skin (gradients), and a clip with a hard cut (palette rebuilds).

## Browser support

- **Module Web Workers** are required for the encoder.
- **A secure context** is required: the app must be served over Hypertext Transfer Protocol Secure (HTTPS) or from `localhost`. Job ids come from `crypto.randomUUID()`, which browsers only expose in secure contexts, so adding a file fails on any other address served without HTTPS. That includes the dev server opened from a phone on your local network: use HTTPS for that, for example through a tunnel.
- **Codecs** depend on the browser and operating system. H.264 works everywhere. HEVC support varies, and the app reports it as an unsupported encoding with advice to re-export as H.264.
- **Memory** per tab varies by browser and device. The memory budget is a conservative cap, not a guarantee on low-memory phones. See [Performance](performance.md#memory-budget).

## Deployment

The build output in `dist/` is static files. Any static host works, with two requirements:

- **Serve over HTTPS**, for the reason above.
- **Rewrite unknown paths to `index.html`.** The app uses browser history routing, so a direct visit or a refresh on `/converter` or `/docs` has to return `index.html` for the router to handle. Without the rewrite, those addresses get the host's 404 page.

There are no environment variables, no server, and nothing else to configure. Asset file names include a content hash and can be cached for a long time, but `index.html` shouldn't be.
