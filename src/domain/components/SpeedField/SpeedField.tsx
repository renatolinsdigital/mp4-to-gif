import { SPEED_STEPS } from '@/domain/helpers/settingsSchema';
import { Slider } from '@/shared/components/Slider';
import { formatSeconds, formatSpeed } from '@/shared/helpers/formatters';

interface SpeedFieldProps {
  value: number;
  onChange: (speed: number) => void;
  /** Length of the section being converted, in seconds. Known when editing one file. */
  sectionLength?: number;
  disabled?: boolean;
}

// Only some steps get a label under the track; labelling all of them crowds narrow screens.
const LABELLED_SPEEDS = new Set([0.25, 0.5, 1, 2, 3, 4]);
const SCALE = SPEED_STEPS.map((speed) => (LABELLED_SPEEDS.has(speed) ? formatSpeed(speed) : ''));
const EXAMPLE_LENGTH = 60;

/** "60.0 s of video becomes a 30.0 s GIF." */
function speedHint(speed: number, sectionLength?: number): string {
  if (sectionLength === undefined) {
    return speed === 1
      ? 'Plays at the video’s own speed.'
      : `A ${EXAMPLE_LENGTH} s clip becomes a ${formatSeconds(EXAMPLE_LENGTH / speed)} GIF.`;
  }
  if (speed === 1) return `Plays at the video’s own speed: ${formatSeconds(sectionLength)}.`;
  return `${formatSeconds(sectionLength)} of video becomes a ${formatSeconds(sectionLength / speed)} GIF.`;
}

/** Speeds the video up or slows it down before it becomes a GIF. */
export function SpeedField({ value, onChange, sectionLength, disabled }: SpeedFieldProps) {
  const index = SPEED_STEPS.indexOf(value);

  return (
    <Slider
      label="Speed"
      value={index === -1 ? SPEED_STEPS.indexOf(1) : index}
      min={0}
      max={SPEED_STEPS.length - 1}
      valueText={formatSpeed(value)}
      scale={SCALE}
      hint={speedHint(value, sectionLength)}
      disabled={disabled}
      onChange={(position) => onChange(SPEED_STEPS[position] ?? 1)}
    />
  );
}
