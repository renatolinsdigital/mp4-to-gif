import { gifFileName } from '@/domain/helpers/fileNaming';
import { DEFAULT_SETTINGS } from '@/domain/helpers/settingsSchema';
import type { ConversionSettings, VideoMetadata } from '@/domain/types/conversion';
import type { ConversionJob, GifResult, JobError } from '@/domain/types/job';

export interface ConverterState {
  job: ConversionJob | null;
  settings: ConversionSettings;
}

export type ConverterAction =
  | { type: 'fileLoaded'; job: ConversionJob }
  | { type: 'fileAnalyzed'; id: string; metadata: VideoMetadata; posterUrl: string }
  | { type: 'fileCleared' }
  | { type: 'jobFailed'; id: string; error: JobError }
  | { type: 'settingsChanged'; settings: ConversionSettings }
  | { type: 'conversionStarted'; id: string }
  | { type: 'conversionProgressed'; id: string; progress: number }
  | { type: 'conversionCompleted'; id: string; result: Omit<GifResult, 'fileName'> }
  | { type: 'conversionCancelled'; id: string };

export const initialConverterState: ConverterState = { job: null, settings: DEFAULT_SETTINGS };

/**
 * Async work reports back with the job id it started on. If the user has since replaced
 * or removed the file, the update is dropped.
 */
function updateJob(
  state: ConverterState,
  id: string,
  update: (job: ConversionJob) => ConversionJob,
): ConverterState {
  if (state.job?.id !== id) return state;
  return { ...state, job: update(state.job) };
}

export function converterReducer(state: ConverterState, action: ConverterAction): ConverterState {
  switch (action.type) {
    case 'fileLoaded':
      return { ...state, job: action.job };

    case 'fileAnalyzed':
      return updateJob(state, action.id, (job) => ({
        ...job,
        status: 'ready',
        metadata: action.metadata,
        posterUrl: action.posterUrl,
      }));

    case 'fileCleared':
      return { ...state, job: null };

    case 'jobFailed':
      return updateJob(state, action.id, (job) => ({
        ...job,
        status: 'error',
        progress: 0,
        error: action.error,
      }));

    case 'settingsChanged':
      return { ...state, settings: action.settings };

    case 'conversionStarted':
      return updateJob(state, action.id, (job) => ({
        ...job,
        status: 'processing',
        progress: 0,
        error: null,
      }));

    case 'conversionProgressed':
      return updateJob(state, action.id, (job) =>
        job.status === 'processing' ? { ...job, progress: action.progress } : job,
      );

    case 'conversionCompleted':
      return updateJob(state, action.id, (job) => ({
        ...job,
        status: 'completed',
        progress: 1,
        result: { ...action.result, fileName: gifFileName(job.file.name) },
      }));

    case 'conversionCancelled':
      // A previous result stays: cancelling a re-run shouldn't throw away the last GIF.
      return updateJob(state, action.id, (job) => ({
        ...job,
        status: job.result ? 'completed' : 'ready',
        progress: 0,
      }));
  }
}
