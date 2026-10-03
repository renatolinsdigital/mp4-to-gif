import { maxSecondsWithinBudget } from '@/domain/helpers/conversionPlan';
import { MAX_FILE_SIZE_BYTES } from '@/domain/helpers/fileValidation';
import {
  LOSSY_TOLERANCES,
  PIXEL_SKIP_THRESHOLDS,
  QUALITY_PRESETS,
  QUALITY_PRESET_ORDER,
} from '@/domain/helpers/qualityPresets';
import {
  DEFAULT_SETTINGS,
  MAX_CUSTOM_WIDTH,
  MIN_CUSTOM_WIDTH,
  SPEED_STEPS,
} from '@/domain/helpers/settingsSchema';
import type {
  DitherMode,
  LossyLevel,
  PixelSkipLevel,
  QualityPreset,
} from '@/domain/types/conversion';
import type { DocsEntry, DocsSection } from '@/domain/types/docs';
import { formatBytes, formatSpeed } from '@/shared/helpers/formatters';

// Every number below is read from the same constants the encoder uses, so the docs can't
// drift from what the converter actually does.

const DITHER_NAMES: Record<DitherMode, string> = {
  off: 'Off',
  ordered: 'Ordered',
  diffusion: 'Diffusion',
};
const LEVEL_NAMES: Record<PixelSkipLevel | LossyLevel, string> = {
  off: 'Off',
  light: 'Light',
  medium: 'Medium',
  strong: 'Strong',
};

/** URL-safe anchor for a preset: "Full HD" becomes "preset-full-hd". */
export function presetDocsId(quality: QualityPreset): string {
  return `preset-${QUALITY_PRESETS[quality].label.toLowerCase().replace(/\s+/g, '-')}`;
}

const PRESET_BEST_FOR: Record<QualityPreset, string> = {
  low: 'Chat apps, email, tickets and anywhere with a strict upload limit.',
  medium: 'Docs, README files, web pages and most everyday clips.',
  high: 'Screen recordings, UI demos and gameplay, where motion should feel fluid.',
  veryHigh: 'Product shots and detailed footage shown large, at HD size.',
  ultra: 'Short 1080p clips where looks matter more than file size.',
};

function presetEntry(quality: QualityPreset): DocsEntry {
  const preset = QUALITY_PRESETS[quality];
  const isDefault = quality === DEFAULT_SETTINGS.quality;
  const height = Math.round((preset.width * 9) / 16);
  return {
    id: presetDocsId(quality),
    title: `${preset.label} preset`,
    keywords: [
      quality,
      ...(isDefault ? ['default'] : []),
      ...(quality === 'ultra' ? ['best export', '1080p'] : []),
    ],
    summary: preset.summary,
    body: [
      `Best for: ${PRESET_BEST_FOR[quality]}`,
      `For a 16:9 video it produces ${preset.width}×${height} frames at ${preset.frameRate} frames per second.`,
    ],
    facts: [
      { aspect: 'Width', effect: `${preset.width} px` },
      { aspect: 'FPS', effect: String(preset.frameRate) },
      { aspect: 'Colors', effect: String(preset.maxColors) },
      { aspect: 'Palette', effect: preset.paletteMode === 'global' ? 'Shared' : 'Adaptive' },
      { aspect: 'Dithering', effect: DITHER_NAMES[preset.dither] },
      { aspect: 'Pixel skip', effect: LEVEL_NAMES[preset.pixelSkip] },
      { aspect: 'Lossy', effect: LEVEL_NAMES[preset.lossy] },
    ],
    related: ['presets-overview', 'choosing-a-preset'],
  };
}

const fullHdSeconds = maxSecondsWithinBudget({ width: 1920, height: 1080 }, 30);
const hdSeconds = maxSecondsWithinBudget({ width: 1280, height: 720 }, 24);
const standardSeconds = maxSecondsWithinBudget({ width: 720, height: 405 }, 10);

export const DOCS_SECTIONS: readonly DocsSection[] = [
  {
    id: 'basics',
    title: 'The basics',
    intro: 'What this tool does, where your files go, and what a GIF can hold.',
    entries: [
      {
        id: 'how-it-works',
        title: 'How conversion works',
        keywords: ['steps', 'process', 'pipeline'],
        summary:
          'Your browser captures frames from the video, reduces each one to a small palette of colors, and writes them into a GIF.',
        body: [
          'Each frame is scaled to the output size with a high-quality (Lanczos) filter, then matched to a palette of up to 256 colors. Only what changed since the previous frame is stored, and the result is compressed.',
          'The work runs in a background thread, so the page stays responsive. More pixels (a bigger size or a higher frame rate) means a longer wait.',
        ],
        related: ['privacy', 'gif-format', 'one-video'],
      },
      {
        id: 'privacy',
        title: 'Runs locally (zero uploads)',
        keywords: ['upload', 'server', 'offline', 'private', 'account', 'security'],
        summary: 'Videos are decoded and encoded in your browser. Nothing is uploaded.',
        body: [
          'Files are read, converted and downloaded on your device. No server does the work and there is no account.',
        ],
        tip: 'Your machine does the work: a faster computer converts faster, and closing the tab stops the conversion.',
      },
      {
        id: 'supported-videos',
        title: 'Supported videos',
        keywords: ['mp4', 'm4v', 'h264', 'h.264', 'codec', 'format', 'input', 'hevc', 'h.265'],
        summary: 'Any MP4 (or M4V) your browser can play.',
        body: [
          'Conversion uses your browser’s built-in video decoder. Nearly every MP4 is H.264, which all modern browsers play. HEVC (H.265), the default on some phones, isn’t supported everywhere; those files show an explanation as soon as you open them.',
          'Audio is ignored: GIFs have no sound.',
        ],
        related: ['unsupported-encoding', 'file-size-limit'],
      },
      {
        id: 'gif-format',
        title: 'What a GIF can and can’t do',
        keywords: ['graphics interchange format', 'limits', 'audio', 'sound', 'why big'],
        summary:
          'A GIF (Graphics Interchange Format) holds at most 256 colors per frame, has no sound, and times frames in hundredths of a second.',
        body: [
          'MP4 stores millions of colors and mostly records what changes over time. A GIF must describe every frame with a small palette, so the same clip is usually much larger as a GIF.',
          'That’s why every setting trades between three things: how the GIF looks, how big it is, and how long it takes to make.',
          'In return, GIFs play everywhere without a player, autoplay in chat apps and docs, and loop on their own.',
        ],
        related: ['colors-per-palette', 'dithering', 'frame-rate'],
      },
      {
        id: 'one-video',
        title: 'One video at a time',
        keywords: ['single', 'file', 'multiple', 'several', 'another video', 'remove', 'replace'],
        summary: 'The converter handles one MP4 at a time.',
        body: [
          'Drop or choose a video and its settings open below it. If you drop several files, the first MP4 is used.',
          'To switch videos, Remove the current one and add the next. Settings are kept, so a series of clips can share a preset.',
          'A conversion keeps running while you visit other pages of the site. Closing or reloading the tab stops it.',
        ],
        related: ['downloads', 'conversion-status'],
      },
      {
        id: 'downloads',
        title: 'Download and file name',
        keywords: ['save', 'name', 'rename', 'replay', 'download gif'],
        summary: 'Download GIF saves the result, named after its video.',
        body: [
          '“my-clip.mp4” becomes “my-clip.gif”. Characters not allowed in file names are replaced.',
          'Replay restarts the preview from the first frame, useful for a GIF set to play once.',
          'Until you download it, the GIF lives only in the page’s memory. Removing the video, reloading or closing the tab discards it.',
        ],
        related: ['gif-panel'],
      },
    ],
  },
  {
    id: 'presets',
    title: 'Presets',
    intro: 'Five starting points, from smallest file to best look. Standard is the default.',
    entries: [
      {
        id: 'presets-overview',
        title: 'How presets work',
        keywords: ['quality', 'adjusted', 'tuned', 'auto', 'reset'],
        summary:
          'One click sets the resolution, the frame rate and all five fine-tune quality settings.',
        body: [
          'Picking a preset also clears earlier fine-tuning. From there, change anything you like.',
          'Once your settings differ, the Output summary marks the preset “adjusted” and the fine-tune panel shows a “Tuned from …” badge. Reset fine-tuning restores the preset’s quality settings.',
          'Frame rate “Auto” follows the current preset, so switching presets switches the frame rate too.',
        ],
        related: ['choosing-a-preset', 'frame-rate', 'colors-per-palette'],
      },
      ...QUALITY_PRESET_ORDER.map(presetEntry),
      {
        id: 'choosing-a-preset',
        title: 'Which preset should I pick?',
        keywords: ['recommend', 'best', 'which', 'help', 'choose', 'advice'],
        summary: 'Start from where the GIF will be shown, then look at what’s in the video.',
        body: [
          'Chat or email with a size limit: Compact. Docs, README files and web pages: Standard. Screen recordings and UI demos: Smooth, whose doubled frame rate keeps cursors and scrolling fluid.',
          'Camera footage with skies, faces or gradients: HD or Full HD. Adaptive palettes and stronger dithering hide banding, but files are much larger.',
          'Long clips at high presets can reach hundreds of megabytes. Before dropping to Compact, trim a section, lower the frame rate, or go one size down.',
        ],
        tip: 'Convert a 3 to 5 second section first. Its size hints at what the full clip will weigh.',
        related: ['section', 'memory-limit'],
      },
    ],
  },
  {
    id: 'output',
    title: 'Output settings',
    intro: 'Size, smoothness, playback and which part of the video becomes the GIF.',
    entries: [
      {
        id: 'resolution',
        title: 'Resolution (width)',
        keywords: [
          'size',
          'width',
          'height',
          'pixels',
          'px',
          'hd',
          'full hd',
          '1080p',
          '720p',
          'upscale',
          'original',
          'custom',
          'aspect ratio',
          'capped',
        ],
        summary: 'The width of the GIF in pixels. The height follows the video’s aspect ratio.',
        body: [
          'HD is 1280 pixels wide (1280×720 for 16:9 video) and Full HD is 1920 (1920×1080). Original keeps the video’s own width.',
          `Custom accepts any whole number from ${MIN_CUSTOM_WIDTH} to ${MAX_CUSTOM_WIDTH} pixels.`,
          'Videos are never upscaled, since that adds bytes but no detail. Ask for 1920 on a 1280-wide video and the GIF stays 1280 wide, with “capped at source width” in the Output summary.',
          'File size follows the pixel count (width × height), so doubling the width roughly quadruples the file.',
        ],
        impact: [
          { aspect: 'Look', effect: 'Sharper when wider' },
          { aspect: 'File size', effect: 'About 4× per doubling' },
          { aspect: 'Speed', effect: 'Slower when wider' },
        ],
        related: ['memory-limit', 'output-details'],
      },
      {
        id: 'frame-rate',
        title: 'Frame rate (FPS)',
        keywords: ['fps', 'frames per second', 'smooth', 'choppy', 'auto', 'delay', 'timing'],
        summary: 'How many frames per second (FPS) are captured from the video.',
        body: [
          'More frames per second means smoother motion. Frame rate never changes how fast the GIF plays (that’s Speed’s job): a lower rate looks choppier, not slower.',
          'File size grows roughly with frame rate: 20 FPS is about twice 10 FPS. Still or slow content gains little from a high rate, since frames that barely change are cheap to store.',
          'Auto uses the preset’s rate. GIF stores delays in hundredths of a second, so 30 FPS plays as 30, 30 and 40 millisecond delays in turn, keeping the total length exact.',
        ],
        impact: [
          { aspect: 'Look', effect: 'Smoother motion' },
          { aspect: 'File size', effect: 'Grows with FPS' },
          { aspect: 'Speed', effect: 'Slower' },
        ],
        related: ['pixel-skip', 'presets-overview'],
      },
      {
        id: 'loop',
        title: 'Loop',
        keywords: ['repeat', 'once', 'infinite', 'forever', 'play'],
        summary: 'Repeat forever, or play once and stop on the last frame.',
        body: [
          'Infinite is the default and the usual choice. Once suits a GIF that ends on a result, like a finished form or a final screen.',
          'Some apps and sites loop every GIF regardless.',
        ],
        impact: [{ aspect: 'File size', effect: 'No effect' }],
      },
      {
        id: 'section',
        title: 'Start / End (section)',
        keywords: [
          'trim',
          'cut',
          'clip',
          'range',
          'part',
          'start',
          'end',
          'current frame',
          'entire video',
        ],
        summary: 'Convert the whole video, or only the part between a start and an end time.',
        body: [
          'Times are in seconds with one decimal. The end must come after the start; an end past the video’s length is capped at its last frame.',
          'To pick an exact moment, pause the video there and use “Set start to current frame” or “Set end to current frame”.',
          'A shorter section is the most effective way to shrink a GIF, and it costs no quality.',
        ],
        impact: [
          { aspect: 'Look', effect: 'No effect' },
          { aspect: 'File size', effect: 'Shorter is smaller' },
          { aspect: 'Speed', effect: 'Shorter is faster' },
        ],
        related: ['speed', 'memory-limit', 'frame-rate'],
      },
      {
        id: 'speed',
        title: 'Speed',
        keywords: [
          'fast forward',
          'faster',
          'slower',
          'slow motion',
          'slow-mo',
          'timelapse',
          'accelerate',
          'playback',
          '2x',
          'duration',
        ],
        summary: 'Plays the video faster or slower in the GIF.',
        body: [
          'At 2×, a one-minute video becomes a 30 second GIF. At 0.5×, a 10 second section becomes 20 seconds of slow motion. Speed applies to the chosen section, and the Output summary shows the resulting GIF length.',
          'Frame rate stays the same at any speed. Speeding up captures moments further apart, so a fast speed at a low frame rate skips motion (raise the frame rate if it looks jumpy). Slowing down past the video’s own frame rate repeats frames: almost free to store, but it looks stepped.',
          'Why not just show each frame for less time? Browsers play frames under 20 milliseconds much slower than asked, so fast GIFs would end up slow. Speed changes which moments are captured instead.',
        ],
        facts: [
          {
            aspect: 'Range',
            effect: `${formatSpeed(SPEED_STEPS[0] as number)} to ${formatSpeed(SPEED_STEPS[SPEED_STEPS.length - 1] as number)}`,
          },
          { aspect: 'Default', effect: formatSpeed(DEFAULT_SETTINGS.speed) },
        ],
        impact: [
          { aspect: 'Look', effect: 'Faster skips more motion' },
          { aspect: 'File size', effect: 'Faster is smaller' },
          { aspect: 'Conversion time', effect: 'Faster is quicker' },
        ],
        related: ['section', 'frame-rate', 'memory-limit'],
      },
    ],
  },
  {
    id: 'fine-tune',
    title: 'Fine-tune quality',
    intro:
      'The advanced controls under “Fine-tune quality”. Each starts at the preset’s value, and changing one moves only that setting away from the preset.',
    entries: [
      {
        id: 'colors-per-palette',
        title: 'Colors per palette',
        keywords: [
          'colors',
          'colours',
          'palette size',
          '64',
          '128',
          '256',
          '256/frame',
          'banding',
          'quantize',
          'quantization',
        ],
        summary: 'How many different colors each frame may use: 64, 128 or 256.',
        body: [
          'A frame can only use colors from its palette. The converter picks the colors that best represent the frame (quantization). More colors give truer skin tones and smoother skies.',
          'One slot is reserved for transparency, which marks pixels unchanged since the previous frame. So 256 means 255 visible colors plus that one.',
          'Fewer colors make smaller files and suit flat content like screenshots, diagrams and UI. On camera footage, 64 colors show steps in gradients (banding) that dithering then has to hide. Compact also picks from a coarser color range, saving a little more.',
        ],
        facts: [
          { aspect: '64', effect: 'Flat, smallest' },
          { aspect: '128', effect: 'Balanced' },
          { aspect: '256', effect: 'Most a GIF allows' },
        ],
        impact: [
          { aspect: 'Look', effect: 'Truer with more' },
          { aspect: 'File size', effect: 'Smaller with fewer' },
          { aspect: 'Speed', effect: 'Little effect' },
        ],
        related: ['dithering', 'palette', 'gif-format'],
      },
      {
        id: 'dithering',
        title: 'Dithering',
        keywords: [
          'dither',
          'bayer',
          'floyd-steinberg',
          'floyd steinberg',
          'error diffusion',
          'ordered',
          'diffusion',
          'banding',
          'gradient',
          'grain',
          'noise',
          'pattern',
        ],
        summary:
          'Mixes palette colors in a fine pattern so the eye sees colors the palette doesn’t have.',
        body: [
          'Without it, a smooth gradient turns into bands of flat color. Dithering trades the bands for fine texture, like print halftones.',
          'Off: flat color areas, smallest files, but gradients band. Best for screenshots, slides and cartoons.',
          'Ordered (Bayer): a fixed, regular pattern. It doesn’t move between frames, so still areas stay still and compress well. A good all-rounder, used by most presets.',
          'Diffusion (Floyd–Steinberg): passes each pixel’s color error on to its neighbors. Smoothest gradients and skin tones, but the texture shifts every frame, making the largest files. Used by Full HD.',
        ],
        facts: [
          { aspect: 'Off', effect: 'Bands, smallest' },
          { aspect: 'Ordered', effect: 'Stable pattern, bigger' },
          { aspect: 'Diffusion', effect: 'Smoothest, biggest' },
        ],
        impact: [
          { aspect: 'Look', effect: 'Smoother gradients' },
          { aspect: 'File size', effect: 'Bigger' },
          { aspect: 'Speed', effect: 'Diffusion is slower' },
        ],
        tip: 'Banding in a sky or a dark background? Raise dithering before adding colors.',
        related: ['colors-per-palette', 'lossy'],
      },
      {
        id: 'palette',
        title: 'Palette: Shared or Adaptive',
        keywords: [
          'global',
          'per frame',
          'perframe',
          'shared',
          'adaptive',
          'flicker',
          'scene change',
          'cut',
          'fade',
        ],
        summary: 'One set of colors for the whole GIF, or colors that adapt as the video changes.',
        body: [
          'Shared: one palette, built from 8 frames spread across the clip, used for every frame. Colors stay perfectly stable and files are smaller, but a clip that cuts from a beach to a night shot must split its colors between both.',
          'Adaptive: keeps the current palette while it fits, and builds a new one when the colors change, such as at a cut or a fade. Each scene gets its own colors.',
          'Rebuilding only on real changes, not every frame, prevents color flicker and lets still areas be skipped.',
        ],
        facts: [
          { aspect: 'Shared', effect: 'One palette, smaller' },
          { aspect: 'Adaptive', effect: 'Follows scenes, truer color' },
        ],
        impact: [
          { aspect: 'Look', effect: 'Adaptive is truer' },
          { aspect: 'File size', effect: 'Shared is smaller' },
          { aspect: 'Speed', effect: 'Adaptive is slower' },
        ],
        related: ['colors-per-palette'],
      },
      {
        id: 'pixel-skip',
        title: 'Skip unchanged pixels',
        keywords: [
          'pixel skip',
          'threshold',
          'transparency',
          'noise',
          'flicker',
          'static',
          'ghost',
          'ghosting',
          'delta',
          '≤',
        ],
        summary:
          'Pixels that look the same as in the previous frame aren’t stored again. This sets how different “the same” can be.',
        body: [
          'Real video is noisy: even a still wall flickers slightly between frames. Storing that flicker costs bytes and shows nothing useful.',
          'Each level is a maximum color distance on the 0 to 255 scale of the red, green and blue (RGB) channels. A pixel that changed less than that keeps its previous value. The numbers on the Home page (like “≤ 12”) are these distances.',
          'Real, lasting changes are always redrawn, so moving objects never leave ghosts or trails. Off still skips exact repeats, which loses nothing.',
        ],
        facts: (['off', 'light', 'medium', 'strong'] as const).map((level) => ({
          aspect: LEVEL_NAMES[level],
          effect: level === 'off' ? 'Exact repeats only' : `≤ ${PIXEL_SKIP_THRESHOLDS[level]}`,
        })),
        impact: [
          { aspect: 'Look', effect: 'Stronger can freeze faint changes' },
          { aspect: 'File size', effect: 'Smaller when stronger' },
          { aspect: 'Speed', effect: 'No effect' },
        ],
        tip: 'If a slow fade or a soft shadow moves in steps, lower this setting.',
        related: ['lossy', 'frame-rate'],
      },
      {
        id: 'lossy',
        title: 'Lossy compression',
        keywords: [
          'lossy',
          'compression',
          'gifsicle',
          'grain',
          'noise',
          'tolerance',
          'artifacts',
          'streaks',
        ],
        summary:
          'Lets the compressor swap in a nearly identical color where that shrinks the file.',
        body: [
          'GIF compression shrinks repeated runs of pixels. Lossy mode nudges a pixel slightly toward a color that extends a run, like the gifsicle tool’s “--lossy” option.',
          'Each level is the furthest a pixel’s color may move. Neighboring pixels stay balanced around the true color, so the loss shows as fine grain, never streaks or smears.',
          'Biggest savings on dithered and noisy footage; little on flat colors, whose runs are already long.',
        ],
        facts: (['off', 'light', 'medium', 'strong'] as const).map((level) => ({
          aspect: LEVEL_NAMES[level],
          effect:
            level === 'off'
              ? 'Every pixel exact'
              : `≤ ${LOSSY_TOLERANCES[level]}${level === 'strong' ? ', visible grain' : level === 'light' ? ', hard to see in motion' : ''}`,
        })),
        impact: [
          { aspect: 'Look', effect: 'Grainier when stronger' },
          { aspect: 'File size', effect: 'Smaller when stronger' },
          { aspect: 'Speed', effect: 'Little effect' },
        ],
        related: ['dithering', 'pixel-skip'],
      },
    ],
  },
  {
    id: 'results',
    title: 'Reading the numbers',
    intro: 'What the figures on the Home page, under Settings and in the GIF panel mean.',
    entries: [
      {
        id: 'output-details',
        title: 'Output summary',
        keywords: ['dimensions', 'frames', 'capped', 'adjusted', 'details', 'summary', 'output'],
        summary:
          'Under Settings, describes the GIF your current settings will make, before you convert.',
        body: [
          'Dimensions: width×height. “Capped at source width” means the chosen width exceeded the video’s, so the video’s own width is used.',
          'Section: the part being converted. Speed and GIF length: how fast it plays and how long the GIF lasts. Frame rate and Frames: frames per second and the total count.',
          'Preset: marked “adjusted” when your settings differ from it. Loop: repeats or plays once.',
        ],
        related: ['resolution', 'speed', 'presets-overview', 'loop'],
      },
      {
        id: 'best-export',
        title: 'Best export: 1920×1080, 256/frame, up to 30',
        keywords: ['home', 'card', 'full hd', 'max', 'maximum', 'highest'],
        summary: 'The Home page card sums up the most the Full HD preset can produce.',
        body: [
          '1920×1080: Full HD for 16:9 video. 256/frame: each frame can have its own palette of up to 256 colors, the GIF maximum. Up to 30: the highest frame rate offered.',
          'Smaller videos aren’t upscaled, so a 720p video stays 1280×720 even with Full HD.',
        ],
        related: ['preset-full-hd', 'colors-per-palette', 'memory-limit'],
      },
      {
        id: 'gif-panel',
        title: 'The GIF panel',
        keywords: ['result', 'size', 'dimensions', 'frames', 'loop', 'preview'],
        summary: 'Appears under Settings when the GIF is ready, with its real figures.',
        body: [
          'Size is the file size. Dimensions, Frames and Loop describe the GIF as it was made.',
          'Change a setting and press Convert again for a new version. It replaces the current one, so download first to keep both.',
        ],
        related: ['downloads', 'output-details'],
      },
      {
        id: 'conversion-status',
        title: 'Conversion status',
        keywords: ['reading', 'converting', 'progress', 'cancel', 'error', 'convert again'],
        summary: 'What the Settings panel shows while a video loads and converts.',
        body: [
          '“Reading the video…”: loading the new video’s length, size and preview frame. Convert to GIF unlocks when it’s done.',
          '“Converting…”: a progress bar tracks the work. Cancel stops it; when converting again, the previous GIF is kept.',
          'If something fails, the message under Settings says why and what to change.',
        ],
        related: ['one-video', 'unsupported-encoding', 'conversion-failed'],
      },
    ],
  },
  {
    id: 'limits',
    title: 'Limits and errors',
    intro: 'Why a conversion can be refused or fail, and what to change.',
    entries: [
      {
        id: 'memory-limit',
        title: 'How long a clip can be',
        keywords: [
          'memory',
          'ram',
          'crash',
          'too long',
          'budget',
          'length',
          'duration',
          'not enough memory',
          'insufficient',
        ],
        summary:
          'The finished GIF stays in the tab’s memory until downloaded, so very long, large clips are refused up front.',
        body: [
          'The limit is the total pixels across all frames: width × height × frames per second × seconds of GIF. Above it, the conversion is refused with a message rather than crashing the tab halfway.',
          'From 1280 pixels wide up, the settings show how many seconds fit at the current size, frame rate and speed.',
          'To fit more: trim a section, lower the frame rate, pick a smaller width, or speed up. At 2× the GIF is half as long, so twice the video fits; slow motion fits less.',
        ],
        facts: [
          { aspect: 'Full HD, 30 FPS', effect: `up to ${fullHdSeconds} s` },
          { aspect: 'HD, 24 FPS', effect: `up to ${hdSeconds} s` },
          { aspect: '720 px, 10 FPS', effect: `up to ${standardSeconds} s` },
        ],
        related: ['section', 'speed', 'resolution', 'frame-rate'],
      },
      {
        id: 'file-size-limit',
        title: 'File size limit',
        keywords: ['2 gb', 'too large', 'big file', 'maximum'],
        summary: `Source videos can be up to ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
        body: [
          'Larger files are flagged as soon as they’re added, because the browser must hold the whole file in memory to read it.',
        ],
      },
      {
        id: 'unsupported-encoding',
        title: 'Unsupported encoding',
        keywords: ['hevc', 'h.265', 'h265', 'codec', 'iphone', 'cannot decode', 'won’t play'],
        summary: 'The MP4 uses a video codec your browser can’t decode.',
        body: [
          'Usually HEVC (H.265), the default on some phones, which some browsers can’t play. Re-export the video as H.264, or try another browser.',
        ],
        related: ['supported-videos'],
      },
      {
        id: 'invalid-or-corrupted',
        title: 'Invalid or corrupted file',
        keywords: ['not mp4', 'broken', 'incomplete', 'damaged', 'invalid'],
        summary: 'The file isn’t a real MP4, or it is damaged or incomplete.',
        body: [
          'Files are checked by content, not name, so a renamed file of another type is caught. Incomplete downloads and interrupted recordings can also fail. Try playing the file in your video player first.',
        ],
      },
      {
        id: 'conversion-failed',
        title: 'Conversion failed',
        keywords: ['failed', 'error', 'went wrong', 'retry', 'try again'],
        summary: 'Something went wrong while creating the GIF.',
        body: [
          'Press Convert to GIF again. If it still fails, lower the resolution or frame rate, or trim a shorter section: large settings on a low-memory device are the usual cause.',
        ],
        related: ['memory-limit', 'conversion-status'],
      },
    ],
  },
];
