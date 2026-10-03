import type { ReactNode } from 'react';

import { looksLikeMp4 } from '@/domain/helpers/fileValidation';
import { useGifConverter, type ConversionOutcome } from '@/domain/hooks/useGifConverter';
import { useToast } from '@/shared/hooks/useToast';

import { ConverterContext, type ConverterContextValue } from './converterContext';

const OUTCOME_TOASTS: Record<
  ConversionOutcome,
  { variant: 'success' | 'error' | 'info'; message: string }
> = {
  converted: { variant: 'success', message: 'GIF ready.' },
  failed: { variant: 'error', message: 'Conversion failed. See the details under Settings.' },
  cancelled: { variant: 'info', message: 'Conversion cancelled.' },
};

/**
 * Holds the converter at app level so a running conversion survives navigating between
 * pages. Must be rendered inside ToastProvider.
 */
export function ConverterProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const converter = useGifConverter();

  const selectFiles = (files: File[]) => {
    const file = files.find(looksLikeMp4);
    if (!file) {
      toast.show('warning', `That isn't an MP4 file: ${files.map((f) => f.name).join(', ')}`);
      return;
    }
    if (files.length > 1) {
      toast.show('info', `One file at a time. Using ${file.name}.`);
    }
    void converter.loadFile(file);
  };

  const convert = async () => {
    const outcome = await converter.convert();
    if (outcome) toast.show(OUTCOME_TOASTS[outcome].variant, OUTCOME_TOASTS[outcome].message);
  };

  const value: ConverterContextValue = {
    job: converter.state.job,
    settings: converter.state.settings,
    selectFiles,
    clearFile: converter.clearFile,
    setSettings: converter.setSettings,
    convert: () => void convert(),
    cancel: converter.cancel,
  };

  return <ConverterContext.Provider value={value}>{children}</ConverterContext.Provider>;
}
