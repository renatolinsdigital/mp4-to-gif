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
} from '@/domain/helpers/settingsSchema';
import type {
  DitherMode,
  LossyLevel,
  PixelSkipLevel,
  QualityPreset,
} from '@/domain/types/conversion';
import type { DocsEntry, DocsSection } from '@/domain/types/docs';
import { formatBytes } from '@/shared/helpers/formatters';

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
          'Your browser plays the video, captures frames at the chosen frame rate, reduces each one to a small palette of colors, and writes them into a GIF.',
        body: [
          'Each frame is captured from the video, scaled down to the output size with a high-quality (Lanczos) filter, then matched to a palette of at most 256 colors. Only the parts of a frame that changed since the previous one are stored, and the result is compressed.',
          'All of this happens in a background thread, so the page stays responsive while it works. Bigger sizes and higher frame rates mean more pixels to process, so they take longer.',
        ],
        related: ['privacy', 'gif-format', 'one-video'],
      },
      {
        id: 'privacy',
        title: 'Runs locally (zero uploads)',
        keywords: ['upload', 'server', 'offline', 'private', 'account', 'security'],
        summary: 'Videos are decoded and encoded inside your browser. Nothing is uploaded.',
        body: [
          'Your files are read from your device, converted on your device, and handed back as downloads. There is no server doing the work and no account to create.',
          'The only network request the site makes is sending the contact form on the About page, and only when you submit it.',
        ],
        tip: 'Because everything runs on your machine, a faster computer converts faster, and closing the tab stops the conversion.',
      },
      {
        id: 'supported-videos',
        title: 'Supported videos',
        keywords: ['mp4', 'm4v', 'h264', 'h.264', 'codec', 'format', 'input', 'hevc', 'h.265'],
        summary: 'Any MP4 (or M4V) your browser can play can be converted.',
        body: [
          'Conversion uses the video decoder built into your browser. Almost every MP4 uses H.264, which every modern browser plays. Some browsers can’t decode HEVC (H.265), which some phones record by default. Those files show an explanation as soon as you open them.',
          'Audio is ignored, since GIFs have no sound.',
        ],
        related: ['unsupported-encoding', 'file-size-limit'],
      },
      {
        id: 'gif-format',
        title: 'What a GIF can and can’t do',
        keywords: ['graphics interchange format', 'limits', 'audio', 'sound', 'why big'],
        summary:
          'A GIF (Graphics Interchange Format) image holds at most 256 colors per frame, has no sound, and stores timing in hundredths of a second.',
        body: [
          'Video formats like MP4 store millions of colors and only describe how the picture changes over time. A GIF has to describe every frame with a small palette, so the same clip is usually much larger as a GIF than as an MP4.',
          'That limit is why every setting here is a trade between three things: how the GIF looks, how big the file is, and how long it takes to make.',
          'GIFs play everywhere without a player, autoplay in chat apps and docs, and loop by themselves. That is what you’re paying for in file size.',
        ],
        related: ['colors-per-palette', 'dithering', 'frame-rate'],
      },
      {
        id: 'one-video',
        title: 'One video at a time',
        keywords: ['single', 'file', 'multiple', 'several', 'another video', 'remove', 'replace'],
        summary: 'The converter works on one MP4 at a time.',
        body: [
          'Drop a video or choose one, and it opens with its settings below it. If you drop several files, the first MP4 is used.',
          'To convert a different video, use Remove on the current one and add the next. Your settings stay as they are, so a series of clips can share the same preset.',
          'A running conversion keeps going if you visit another page of the site, but closing or reloading the tab stops it.',
        ],
        related: ['downloads', 'conversion-status'],
      },
      {
        id: 'downloads',
        title: 'Download and file name',
        keywords: ['save', 'name', 'rename', 'replay', 'download gif'],
        summary: 'Download GIF saves the result, named after its video.',
        body: [
          'The GIF is named after the video, so “my-clip.mp4” becomes “my-clip.gif”. Characters that aren’t allowed in file names are replaced.',
          'Replay restarts the preview from the first frame, handy for a GIF set to play once.',
          'The GIF lives in the page’s memory until you download it. Removing the video, reloading or closing the tab discards it.',
        ],
        related: ['gif-panel'],
      },
    ],
  },
  {
    id: 'presets',
    title: 'Presets',
    intro: `Five starting points, from smallest to best looking. Standard is the default.`,
    entries: [
      {
        id: 'presets-overview',
        title: 'How presets work',
        keywords: ['quality', 'adjusted', 'tuned', 'auto', 'reset'],
        summary:
          'A preset sets the resolution, the frame rate, and the five fine-tune quality settings in one click.',
        body: [
          'Picking a preset sets its resolution and frame rate and clears any fine-tuning you did before. You can then change anything you like.',
          'Once your settings differ from the preset, the Output summary under Settings shows the preset as “adjusted”, and the fine-tune panel shows a “Tuned from …” badge. Reset fine-tuning puts the quality settings back to the preset’s.',
          'Frame rate “Auto” always follows the current preset, so switching presets also switches the frame rate.',
        ],
        related: ['choosing-a-preset', 'frame-rate', 'colors-per-palette'],
      },
      ...QUALITY_PRESET_ORDER.map(presetEntry),
      {
        id: 'choosing-a-preset',
        title: 'Which preset should I pick?',
        keywords: ['recommend', 'best', 'which', 'help', 'choose', 'advice'],
        summary: 'Start from where the GIF will be shown, then from what is in the video.',
        body: [
          'Sharing in chat or email with a size limit: Compact. Docs, README files and web pages: Standard. Screen recordings and UI demos: Smooth, which doubles the frame rate so cursor movement and scrolling look fluid.',
          'Camera footage with skies, faces or gradients: HD or Full HD. Their adaptive palettes and stronger dithering hide banding, at the cost of much larger files.',
          'Long clips at high presets can grow to hundreds of megabytes. Trim a section, lower the frame rate, or drop one size step before reaching for Compact.',
        ],
        tip: 'Convert a 3 to 5 second section first. Its size tells you roughly what the full clip will weigh.',
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
          'HD is 1280 pixels wide (1280×720 for 16:9 video) and Full HD is 1920 (1920×1080). Original keeps each video’s own width.',
          `Custom accepts any whole number from ${MIN_CUSTOM_WIDTH} to ${MAX_CUSTOM_WIDTH} pixels.`,
          'Videos are never upscaled. If you ask for 1920 and the video is 1280 wide, the GIF stays 1280 wide and the Output summary shows “capped at source width”. Upscaling would only make the file bigger without adding detail.',
          'File size grows with the number of pixels, which is width times height. Doubling the width roughly quadruples the file.',
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
        keywords: [
          'fps',
          'frames per second',
          'smooth',
          'choppy',
          'auto',
          'delay',
          'speed',
          'timing',
        ],
        summary: 'How many frames per second (FPS) are captured from the video.',
        body: [
          'Higher frame rates make motion smoother. The GIF plays at the same speed as the video whatever the frame rate, so a lower rate looks choppier, never slower.',
          'File size grows roughly in step with frame rate: 20 FPS is about twice the size of 10 FPS. Still or slow content gains little from a high rate, because frames that barely change are cheap to store.',
          'Auto uses the current preset’s rate. GIF stores each frame’s delay in hundredths of a second, so 30 FPS is played as delays of 30, 30 and 40 milliseconds in turn, which keeps the total length exact.',
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
        summary: 'Whether the GIF repeats forever or plays once and stops on its last frame.',
        body: [
          'Infinite is the usual choice and the default. Once suits a GIF that ends on a result, like a finished form or a final screen.',
          'Some apps and sites loop every GIF regardless of this setting.',
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
        summary: 'Convert the entire video, or only the part between a start and an end time.',
        body: [
          'Times are in seconds, with one decimal. The end must come after the start, and an end past the video’s length is capped at its last frame.',
          'Pause the video where you want and use “Set start to current frame” or “Set end to current frame” to copy the playback position. It’s the quickest way to pick an exact moment.',
          'A shorter section is the single most effective way to get a smaller GIF, and it doesn’t cost any quality.',
        ],
        impact: [
          { aspect: 'Look', effect: 'No effect' },
          { aspect: 'File size', effect: 'Shorter is smaller' },
          { aspect: 'Speed', effect: 'Shorter is faster' },
        ],
        related: ['memory-limit', 'frame-rate'],
      },
    ],
  },
  {
    id: 'fine-tune',
    title: 'Fine-tune quality',
    intro:
      'The advanced controls under “Fine-tune quality”. Each one starts at the preset’s value; change one and only that setting moves away from the preset.',
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
          'A GIF frame can only use colors from its palette. The converter picks the colors that best represent the frame (quantization). More colors mean truer skin tones and smoother skies.',
          'One slot is kept for transparency, which marks pixels that didn’t change since the previous frame. So 256 means 255 visible colors plus that one.',
          'Fewer colors make smaller files and look fine on flat content like screenshots, diagrams and UI. On camera footage, 64 colors show visible steps (banding) in gradients, which dithering then has to hide. The Compact preset also picks its colors from a coarser color range, which saves a little more.',
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
          'Mixes nearby palette colors in a fine pattern so the eye sees colors the palette doesn’t have.',
        body: [
          'Without dithering, a smooth gradient becomes visible bands of flat color. Dithering trades those bands for fine texture, much like print halftones.',
          'Off: flat color areas and the smallest files. Best for screenshots, slides and cartoons. Gradients will band.',
          'Ordered (Bayer): a regular, fixed pattern. Because the pattern doesn’t move between frames, still areas stay still and compress well. A good all-rounder, used by most presets.',
          'Diffusion (Floyd–Steinberg): spreads each pixel’s color error onto its neighbors. Gives the smoothest gradients and skin tones, but the texture changes a little every frame, which makes the largest files. Used by Full HD.',
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
        tip: 'Seeing banding in a sky or a dark background? Turn dithering up before adding colors.',
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
        summary:
          'Whether the whole GIF uses one set of colors, or the colors adapt as the video changes.',
        body: [
          'Shared builds one palette from 8 frames spread evenly across the clip and uses it for every frame. Colors stay perfectly stable and files are smaller, but a clip that changes scenes, say from a beach to a night shot, has to share colors between both.',
          'Adaptive keeps the current palette while it still fits, and builds a new one when the picture’s colors change, for example at a cut or a fade. Each scene gets colors chosen for it.',
          'Rebuilding only on real changes, rather than every frame, keeps colors from flickering and lets still areas be skipped.',
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
          'Pixels that look the same as in the previous frame are not stored again. This sets how different “the same” may be.',
        body: [
          'Real video is noisy: even a still wall flickers a little from frame to frame. Storing that flicker costs a lot of bytes and shows nothing useful.',
          'Each level is a maximum color distance, on the 0 to 255 scale of the red, green and blue (RGB) channels. A pixel that moved less than that since the last frame is left as it was. The numbers in the table on the Home page (like “≤ 12”) are these distances.',
          'Anything that really changes and stays changed is always redrawn, so moving objects never leave ghosts or trails. Off still skips pixels that are exactly identical, which loses nothing.',
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
        tip: 'If a slow fade or a subtle shadow looks like it moves in steps, lower this setting.',
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
        summary: 'Lets the compressor reuse a nearly identical color where that shrinks the file.',
        body: [
          'GIF compression works by finding repeated runs of pixels. Lossy compression allows a pixel to be nudged slightly toward a color that continues a run, much like the “--lossy” option of the gifsicle tool.',
          'Each level is the largest color distance a pixel may move. Neighboring pixels are kept balanced around the true color, so the loss shows as fine grain, never as streaks or smears.',
          'It saves the most on dithered and noisy footage, and little on flat colors where runs are already long.',
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
          'The Output summary under Settings describes the GIF your settings will make, before you convert.',
        body: [
          'Dimensions: the GIF’s width×height. “Capped at source width” means the chosen width was larger than the video, so the video’s own width is used.',
          'Section: the part of the video that will be converted. Frame rate and Frames: how many frames per second, and how many frames in total.',
          'Preset: the chosen preset, marked “adjusted” when your settings differ from it. Loop: whether it repeats or plays once.',
        ],
        related: ['resolution', 'presets-overview', 'loop'],
      },
      {
        id: 'best-export',
        title: 'Best export: 1920×1080, 256/frame, up to 30',
        keywords: ['home', 'card', 'full hd', 'max', 'maximum', 'highest'],
        summary: 'The card on the Home page sums up the most the Full HD preset can produce.',
        body: [
          '1920×1080 is Full HD for 16:9 video. 256/frame means each frame can have its own palette of up to 256 colors, the most a GIF allows. Up to 30 is the highest frame rate offered.',
          'Smaller videos are never upscaled, so a 720p video stays 1280×720 even with the Full HD preset.',
        ],
        related: ['preset-full-hd', 'colors-per-palette', 'memory-limit'],
      },
      {
        id: 'gif-panel',
        title: 'The GIF panel',
        keywords: ['result', 'size', 'dimensions', 'frames', 'loop', 'preview'],
        summary: 'Shown under Settings once the GIF is ready, with its real figures.',
        body: [
          'Size is the GIF’s file size. Dimensions, Frames and Loop describe the GIF as it was made.',
          'Change a setting and press Convert again to make a new version. It replaces the previous one, so download the GIF first if you want to keep both.',
        ],
        related: ['downloads', 'output-details'],
      },
      {
        id: 'conversion-status',
        title: 'Conversion status',
        keywords: ['reading', 'converting', 'progress', 'cancel', 'error', 'convert again'],
        summary: 'What the Settings panel shows while a video loads and converts.',
        body: [
          '“Reading the video…”: the video was just added and its length, size and preview frame are being loaded. Convert to GIF becomes available once that finishes.',
          '“Converting…”: a progress bar shows how far along it is. Cancel stops it; if you were converting again, the previous GIF is kept.',
          'If something goes wrong, the message under Settings says why and what to change.',
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
          'The finished GIF is held in the tab’s memory until you download it, so very long, large clips are refused up front.',
        body: [
          'The limit depends on the number of pixels across all frames: width × height × frames per second × seconds. Above it, the conversion is refused with a message instead of crashing the tab halfway through.',
          'At 1280 pixels wide and above, the settings show how many seconds fit at the current size and frame rate.',
          'To fit a longer clip, trim a section, lower the frame rate, or choose a smaller width.',
        ],
        facts: [
          { aspect: 'Full HD, 30 FPS', effect: `up to ${fullHdSeconds} s` },
          { aspect: 'HD, 24 FPS', effect: `up to ${hdSeconds} s` },
          { aspect: '720 px, 10 FPS', effect: `up to ${standardSeconds} s` },
        ],
        related: ['section', 'resolution', 'frame-rate'],
      },
      {
        id: 'file-size-limit',
        title: 'File size limit',
        keywords: ['2 gb', 'too large', 'big file', 'maximum'],
        summary: `Source videos can be up to ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
        body: [
          'Larger files are marked with an error as soon as they are added, because the browser has to hold the whole file in memory to read it.',
        ],
      },
      {
        id: 'unsupported-encoding',
        title: 'Unsupported encoding',
        keywords: ['hevc', 'h.265', 'h265', 'codec', 'iphone', 'cannot decode', 'won’t play'],
        summary: 'The MP4 uses a video codec your browser can’t decode.',
        body: [
          'This is most often HEVC (H.265), which some phones record by default and some browsers can’t play. Re-export the video as H.264, or try another browser.',
        ],
        related: ['supported-videos'],
      },
      {
        id: 'invalid-or-corrupted',
        title: 'Invalid or corrupted file',
        keywords: ['not mp4', 'broken', 'incomplete', 'damaged', 'invalid'],
        summary: 'The file isn’t a real MP4, or it is damaged or incomplete.',
        body: [
          'Files are checked by their contents, not just their name, so a renamed file of another type is caught. An incomplete download or an interrupted recording can also fail to read. Try playing the file in your video player first.',
        ],
      },
      {
        id: 'conversion-failed',
        title: 'Conversion failed',
        keywords: ['failed', 'error', 'went wrong', 'retry', 'try again'],
        summary: 'Something went wrong while creating the GIF.',
        body: [
          'Press Convert to GIF again first. If it fails again, lower the resolution or frame rate, or trim a shorter section. Large settings on a device with little memory are the usual cause.',
        ],
        related: ['memory-limit', 'conversion-status'],
      },
    ],
  },
];
