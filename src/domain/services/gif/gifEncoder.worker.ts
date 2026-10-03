import { toConversionError } from '@/domain/helpers/conversionErrors';
import type { EncoderRequest, EncoderResponse } from '@/domain/services/gif/gifEncoderProtocol';
import { GifEncodingSession } from '@/domain/services/gif/gifEncodingSession';

// Quantizing and LZW-compressing frames is CPU heavy, so it runs here to keep the UI responsive.

let session: GifEncodingSession | null = null;

function reply(message: EncoderResponse, transfer: Transferable[] = []): void {
  self.postMessage(message, { transfer });
}

function requireSession(): GifEncodingSession {
  if (!session) throw new Error('Encoder used before init.');
  return session;
}

function handle(request: EncoderRequest): void {
  switch (request.type) {
    case 'init':
      session = new GifEncodingSession(request.options);
      reply({ id: request.id, type: 'ack' });
      return;
    case 'palette':
      requireSession().setGlobalPalette(
        request.samples.map((buffer) => new Uint8ClampedArray(buffer)),
      );
      reply({ id: request.id, type: 'ack' });
      return;
    case 'frame':
      requireSession().addFrame(new Uint8ClampedArray(request.pixels), request.delayMs);
      reply({ id: request.id, type: 'ack' });
      return;
    case 'finish': {
      const active = requireSession();
      const bytes = active.finish();
      const isWholeBuffer = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength;
      // Transferring avoids copying what can be a 100+ MB GIF back to the main thread.
      const buffer = isWholeBuffer
        ? bytes.buffer
        : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      reply({ id: request.id, type: 'result', bytes: buffer, frameCount: active.framesWritten }, [
        buffer,
      ]);
      session = null;
      return;
    }
  }
}

self.onmessage = (event: MessageEvent<EncoderRequest>) => {
  try {
    handle(event.data);
  } catch (error) {
    const conversionError = toConversionError(error);
    reply({
      id: event.data.id,
      type: 'error',
      code: conversionError.code,
      message: conversionError.message,
    });
  }
};
