import { useState } from 'react';

import { sectionSchema } from '@/domain/helpers/settingsSchema';
import type { Section } from '@/domain/types/conversion';
import { Button } from '@/shared/components/Button';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { TextField } from '@/shared/components/TextField';
import { formatDuration } from '@/shared/helpers/formatters';

import styles from './SectionFields.module.scss';

interface SectionFieldsProps {
  value: Section;
  onChange: (section: Section) => void;
  /** Known when editing a single file; enables bounds and "use current time". */
  duration?: number;
  /** Playback position of the preview video, if one is shown. */
  currentTime?: number;
  disabled?: boolean;
}

const MODE_OPTIONS = [
  { value: 'full', label: 'Entire video' },
  { value: 'range', label: 'A section' },
] as const;

const DEFAULT_SECTION_LENGTH = 5;
const roundTime = (seconds: number) => Math.round(seconds * 10) / 10;

type Draft = { start: string; end: string };

function toDraft(section: Section): Draft {
  return section.mode === 'range'
    ? { start: String(section.start), end: String(section.end) }
    : { start: '0', end: String(DEFAULT_SECTION_LENGTH) };
}

export function SectionFields({
  value,
  onChange,
  duration,
  currentTime,
  disabled,
}: SectionFieldsProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(value));
  const [syncedValue, setSyncedValue] = useState(value);
  const [error, setError] = useState<string | null>(null);

  // Re-sync the text inputs when the section changes from outside (e.g. "Use current time").
  if (value !== syncedValue) {
    setSyncedValue(value);
    setDraft(toDraft(value));
    setError(null);
  }

  const commit = (next: Draft) => {
    setDraft(next);
    const parsed = sectionSchema.safeParse(next);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid section.');
      return;
    }
    if (duration !== undefined && parsed.data.start >= duration) {
      setError(`Start must be before the end of the video (${formatDuration(duration)}).`);
      return;
    }
    setError(null);
    const section: Section = { mode: 'range', ...parsed.data };
    setSyncedValue(section);
    onChange(section);
  };

  const changeMode = (mode: Section['mode']) => {
    if (mode === 'full') {
      onChange({ mode: 'full' });
      return;
    }
    const end = roundTime(Math.min(duration ?? DEFAULT_SECTION_LENGTH, DEFAULT_SECTION_LENGTH));
    onChange({ mode: 'range', start: 0, end });
  };

  const setFromCurrentTime = (field: keyof Draft) => {
    if (currentTime === undefined) return;
    commit({ ...draft, [field]: String(roundTime(currentTime)) });
  };

  return (
    <div className={styles.wrapper}>
      <SegmentedControl
        legend="Start / End"
        options={MODE_OPTIONS}
        value={value.mode}
        onChange={changeMode}
        disabled={disabled}
      />
      {value.mode === 'range' && (
        <div className={styles.range}>
          <div className={styles.fields}>
            <TextField
              label="Start"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              suffix="s"
              size="sm"
              value={draft.start}
              disabled={disabled}
              onChange={(start) => commit({ ...draft, start })}
            />
            <TextField
              label="End"
              type="number"
              inputMode="decimal"
              min={0}
              step={0.1}
              suffix="s"
              size="sm"
              value={draft.end}
              disabled={disabled}
              onChange={(end) => commit({ ...draft, end })}
            />
          </div>
          {currentTime !== undefined && (
            <div className={styles.timeButtons}>
              <Button
                label="Set start to current frame"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => setFromCurrentTime('start')}
              />
              <Button
                label="Set end to current frame"
                size="sm"
                variant="secondary"
                disabled={disabled}
                onClick={() => setFromCurrentTime('end')}
              />
            </div>
          )}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : (
            <p className={styles.hint}>
              {duration !== undefined
                ? `Video length ${formatDuration(duration)}. The end is capped at the video's length.`
                : "The end is capped at the video's length."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
