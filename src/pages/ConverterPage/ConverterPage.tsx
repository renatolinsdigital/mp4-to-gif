import { useState } from 'react';

import { DropZone } from '@/domain/components/DropZone';
import { ResultPanel } from '@/domain/components/ResultPanel';
import { SettingsPanel } from '@/domain/components/SettingsPanel';
import { SourceVideoPanel } from '@/domain/components/SourceVideoPanel';
import { useConverter } from '@/domain/hooks/useConverter';

import styles from './ConverterPage.module.scss';

/** One file at a time: the video, its settings below it, then the GIF. */
export function ConverterPage() {
  const converter = useConverter();
  const { job, settings } = converter;
  const [currentTime, setCurrentTime] = useState(0);

  return (
    <div className={styles.page}>
      <h1 className="visually-hidden">Converter</h1>

      {job ? (
        <>
          <SourceVideoPanel
            key={job.id}
            job={job}
            onRemove={converter.clearFile}
            onTimeChange={setCurrentTime}
          />
          <SettingsPanel
            job={job}
            settings={settings}
            currentTime={currentTime}
            onSettingsChange={converter.setSettings}
            onConvert={converter.convert}
            onCancel={converter.cancel}
          />
          {job.result && <ResultPanel sourceName={job.file.name} result={job.result} />}
        </>
      ) : (
        <DropZone onFiles={converter.selectFiles} />
      )}
    </div>
  );
}
