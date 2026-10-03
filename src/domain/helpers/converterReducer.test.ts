import { expect, test } from 'vitest';

import { makeGifResult, makeJob } from '@/tests/fixtures';

import { converterReducer, initialConverterState, type ConverterState } from './converterReducer';

function stateWith(job: ReturnType<typeof makeJob>): ConverterState {
  return { ...initialConverterState, job };
}

const resultWithoutName = () => {
  const result: Partial<ReturnType<typeof makeGifResult>> = makeGifResult();
  delete result.fileName;
  return result as Omit<ReturnType<typeof makeGifResult>, 'fileName'>;
};

test('loading a file replaces the current one', () => {
  const first = makeJob();
  const second = makeJob();
  const next = converterReducer(stateWith(first), { type: 'fileLoaded', job: second });
  expect(next.job).toBe(second);
});

test('names the GIF after the source file', () => {
  const job = makeJob({ status: 'processing', file: new File([], 'my-video.mp4') });
  const next = converterReducer(stateWith(job), {
    type: 'conversionCompleted',
    id: job.id,
    result: resultWithoutName(),
  });
  expect(next.job).toMatchObject({ status: 'completed', progress: 1 });
  expect(next.job?.result?.fileName).toBe('my-video.gif');
});

test('ignores updates for a file that has been replaced', () => {
  const current = makeJob();
  const state = stateWith(current);
  const next = converterReducer(state, {
    type: 'conversionProgressed',
    id: 'an-older-job',
    progress: 0.5,
  });
  expect(next).toBe(state);
});

test('cancelling returns to ready, or keeps the previous GIF', () => {
  const fresh = makeJob({ status: 'processing', progress: 0.4 });
  expect(
    converterReducer(stateWith(fresh), { type: 'conversionCancelled', id: fresh.id }).job,
  ).toMatchObject({ status: 'ready', progress: 0 });

  const rerun = makeJob({ status: 'processing', result: makeGifResult() });
  expect(
    converterReducer(stateWith(rerun), { type: 'conversionCancelled', id: rerun.id }).job,
  ).toMatchObject({ status: 'completed', result: rerun.result });
});

test('a failure records the error and resets progress', () => {
  const job = makeJob({ status: 'processing', progress: 0.7 });
  const next = converterReducer(stateWith(job), {
    type: 'jobFailed',
    id: job.id,
    error: { code: 'corrupted', message: 'Broken.' },
  });
  expect(next.job).toMatchObject({ status: 'error', progress: 0, error: { message: 'Broken.' } });
});

test('clearing the file keeps the settings', () => {
  const settings = { ...initialConverterState.settings, loop: 'once' as const };
  const next = converterReducer({ job: makeJob(), settings }, { type: 'fileCleared' });
  expect(next).toEqual({ job: null, settings });
});
