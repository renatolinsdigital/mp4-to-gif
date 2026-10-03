# Stack, dependencies, and plugins

Every dependency in `package.json`, what it's used for, and why it was chosen. Version ranges are the ones in `package.json` at the time of writing.

## At a glance

| Layer                       | Choice                                                       |
| --------------------------- | ------------------------------------------------------------ |
| Language                    | TypeScript 6, strict                                         |
| User interface              | React 19                                                     |
| Routing                     | React Router 8 (data router)                                 |
| Build and dev server        | Vite 8                                                       |
| Styling                     | Sass with CSS Modules                                        |
| Input validation            | Zod 4                                                        |
| Color quantization          | gifenc 1, quantizer only                                     |
| GIF writing and compression | Project code in `src/domain/services/gif/`                   |
| Video decoding              | The browser's built-in decoder, through `HTMLVideoElement`   |
| Testing                     | Vitest 5, React Testing Library, jsdom                       |
| Code quality                | ESLint 10, typescript-eslint, Prettier 3, Husky, lint-staged |

GIF is Graphics Interchange Format. CSS is Cascading Style Sheets.

## Runtime dependencies

These ship to the browser.

| Package                               | Range   | Used for                                                                                               |
| ------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| `react`, `react-dom`                  | ^19.3.0 | Rendering                                                                                              |
| `react-router`                        | ^8.4.0  | `createBrowserRouter`, lazy routes, error boundaries, `NavLink`, and search params for the docs search |
| `zod`                                 | ^4.6.5  | Validating typed input: the custom width and the section start and end (`settingsSchema.ts`)           |
| `gifenc`                              | ^1.0.3  | `quantize()` only, to build each palette                                                               |
| `@fontsource-variable/archivo`        | ^5.3.0  | Body and display font, including its width axis for the expanded headings                              |
| `@fontsource-variable/jetbrains-mono` | ^5.3.0  | Monospace font for numbers and technical values                                                        |

### Why gifenc is used only for quantizing

gifenc's quantizer is a port of PnnQuant.js, based on pairwise nearest neighbor clustering. It's fast and gives good palettes, so the app uses it.

gifenc also includes a GIF writer, but this app writes GIFs with its own code, because the encoder needs control a general-purpose writer doesn't give:

- Frames that cover only the rectangle that changed.
- Folding a frame with no changes into the previous frame's delay, after that frame was already written.
- A local color table only when a frame's palette differs from the global one.
- An LZW (Lempel-Ziv-Welch) compressor that can approximate pixels in lossy mode and report back which pixels the decoder will actually show, so the next frame's decisions are based on what's on screen.

gifenc's own README also notes it has no dithering support and suits flat graphics better than video. The app does its own dithering. See [Encoding](encoding.md).

The package has no type definitions, so `src/types/gifenc.d.ts` declares the one function the app uses.

### Why fonts are bundled

Fonts come from `@fontsource-variable` packages and are bundled by Vite, not loaded from a font content delivery network (CDN). That keeps the "nothing leaves your device" promise literal: the app makes no third-party requests at all.

## Build tooling and plugins

| Package                                           | Role                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `vite`                                            | Dev server with hot module replacement, and the production bundler               |
| `@vitejs/plugin-react`                            | The Vite plugin for React: the JSX transform and Fast Refresh during development |
| `typescript`                                      | Type checking with `tsc -b`. Vite strips types without checking them.            |
| `sass`                                            | Compiles `.scss` files, including CSS Modules                                    |
| `@types/react`, `@types/react-dom`, `@types/node` | Type definitions. `@types/node` is only for `vite.config.ts`.                    |

JSX is JavaScript XML, React's markup syntax.

### Vite configuration

`vite.config.ts` does three things:

- Maps the `@` alias to `src/`, matching `paths` in `tsconfig.app.json`.
- Builds workers as ECMAScript (ES) modules (`worker.format: 'es'`), so the worker uses `import` like the rest of the code.
- Configures Vitest: environment, setup file, CSS Modules class names, and coverage. See [Testing](testing.md).

The worker is created with the pattern Vite recognizes:

```ts
new Worker(new URL('./gifEncoder.worker.ts', import.meta.url), { type: 'module' });
```

Vite emits the worker as its own chunk, bundled with what it imports (gifenc's quantizer and the encoder). It downloads the first time a conversion starts.

### TypeScript configuration

`tsconfig.app.json` turns on `strict` plus several checks beyond it:

- `noUncheckedIndexedAccess`: indexing an array returns `T | undefined`. Hot loops cast typed array reads with `as number` where the index is in bounds by construction.
- `verbatimModuleSyntax`: type-only imports must be written as `import type`. ESLint's `consistent-type-imports` rule enforces the same.
- `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, and `noUncheckedSideEffectImports`.
- `paths` maps `@/*` to `src/*`.

`tsconfig.node.json` covers `vite.config.ts` separately, and `tsconfig.json` references both.

## Code quality tools and plugins

| Package                       | Role                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `eslint`, `@eslint/js`        | Linting, starting from the recommended JavaScript rules                         |
| `typescript-eslint`           | TypeScript parser and the `strict` rule set                                     |
| `eslint-plugin-react-hooks`   | Rules of Hooks and dependency array checks                                      |
| `eslint-plugin-react-refresh` | Warns when a module's exports would break Fast Refresh                          |
| `globals`                     | Browser and worker globals for ESLint, plus Node.js globals for the Vite config |
| `prettier`                    | Formatting: single quotes, trailing commas, 100-column lines, semicolons        |
| `husky`                       | Installs the Git pre-commit hook in `.husky/pre-commit`                         |
| `lint-staged`                 | Runs ESLint and Prettier on staged files only                                   |

Project-specific ESLint rules, in `eslint.config.js`:

- `@typescript-eslint/no-explicit-any`: error.
- `@typescript-eslint/consistent-type-imports`: error.
- `no-restricted-imports`: blocks `../../` imports in favor of the `@/` alias.
- `react-refresh/only-export-components`: warning, with constant exports allowed.

The repository's `.vscode/settings.json` formats with Prettier on save and applies ESLint fixes, so the editor and the commit hook agree.

## Testing libraries

| Package                       | Role                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| `vitest`                      | Test runner, configured inside `vite.config.ts`                  |
| `jsdom`                       | Browser-like environment for component tests                     |
| `@testing-library/react`      | Rendering components and querying them as a user would           |
| `@testing-library/user-event` | Realistic keyboard and pointer interaction                       |
| `@testing-library/jest-dom`   | Document Object Model (DOM) matchers such as `toBeInTheDocument` |
| `@vitest/coverage-v8`         | Coverage reports from V8's built-in coverage                     |

## Browser platform features

The app leans on the browser for much of its work. These are as much a part of the stack as any package:

| Feature                                 | Used for                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------- |
| `HTMLVideoElement`                      | Decoding the MP4 with the browser's own decoder, and seeking to each frame time |
| Canvas 2D (`drawImage`, `getImageData`) | Turning decoded frames into pixels, and halving them cheaply                    |
| Module Web Workers                      | Running the encoder off the main thread                                         |
| Transferable `ArrayBuffer`s             | Moving frames to the worker, and the finished GIF back, without copying         |
| `AbortController`                       | Cancelling a conversion across seeks, frame capture, and the worker             |
| `Blob` and object URLs                  | Previewing the source, poster, and GIF, and downloading the result              |
| `crypto.randomUUID()`                   | Job ids. Only available in secure contexts (HTTPS or `localhost`).              |
| `localStorage` and `matchMedia`         | Remembering the theme choice, and reading the operating system's color scheme   |

URL is Uniform Resource Locator. HTTPS is Hypertext Transfer Protocol Secure.

## Left out on purpose

- **No backend.** Conversion is local by design, so there's nothing to host but static files.
- **No FFmpeg compiled to WebAssembly.** The browser already ships a video decoder, and using it through `<video>` costs no extra download. The trade-off is that the app can only read codecs the browser supports. See [Development](development.md#browser-support).
- **No state management library.** One `useReducer` and two contexts (converter and toast) cover the app's state.
- **No CSS framework or animation library.** Styling uses Sass tokens and CSS Modules, per `.claude/engineering/frontend.md`, and motion is plain CSS.
- **No component library.** The shared components are small and built for this design system.

## Adding a dependency

First check whether a few lines of code would do the job (`.claude/engineering/coding-standards.md`). If you add one anyway, run `npm run build` before and after and compare chunk sizes. Anything the app shell imports lands in the entry chunk that every page loads. See [Performance](performance.md#bundle-size).
