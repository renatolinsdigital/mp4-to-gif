import { createContext } from 'react';

import type { ConversionSettings } from '@/domain/types/conversion';
import type { ConversionJob } from '@/domain/types/job';

export interface ConverterContextValue {
  /** The file being converted, or null before one is chosen. */
  job: ConversionJob | null;
  settings: ConversionSettings;
  /** Takes the first MP4 from a drop or file picker and replaces the current file. */
  selectFiles: (files: File[]) => void;
  clearFile: () => void;
  setSettings: (settings: ConversionSettings) => void;
  convert: () => void;
  cancel: () => void;
}

export const ConverterContext = createContext<ConverterContextValue | null>(null);
