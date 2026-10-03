import { useRef, useState, type DragEvent } from 'react';

import { Button } from '@/shared/components/Button';
import { Icon } from '@/shared/icons';
import { cx } from '@/shared/helpers/cx';

import styles from './DropZone.module.scss';

interface DropZoneProps {
  onFiles: (files: File[]) => void;
}

const ACCEPT = 'video/mp4,.mp4,.m4v';

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files');
}

export function DropZone({ onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  // dragenter/dragleave fire for every child element, so count depth to know when we really left.
  const dragDepth = useRef(0);

  const handleDragEnter = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    dragDepth.current++;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };

  const handleDragOver = (event: DragEvent) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className={cx(styles.zone, isDragging && styles.dragging)}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      data-testid="drop-zone"
    >
      <span className={styles.iconWrap}>
        <Icon name="upload" size={36} />
      </span>
      <div>
        <p className={styles.title}>
          {isDragging ? 'Release to open it' : 'Drop an MP4 file here'}
        </p>
        <p className={styles.subtitle}>One video at a time. Or</p>
      </div>
      <Button label="Choose File" icon="plus" size="lg" onClick={() => inputRef.current?.click()} />
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={ACCEPT}
        tabIndex={-1}
        aria-label="Choose an MP4 file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          // Reset so choosing the same file again still fires a change event.
          event.target.value = '';
        }}
      />
    </div>
  );
}
