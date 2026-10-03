import { useContext } from 'react';

import {
  ConverterContext,
  type ConverterContextValue,
} from '@/domain/components/ConverterProvider/converterContext';

export function useConverter(): ConverterContextValue {
  const value = useContext(ConverterContext);
  if (!value) throw new Error('useConverter must be used inside <ConverterProvider>.');
  return value;
}
