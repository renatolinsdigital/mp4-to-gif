import { ConversionError } from '@/domain/helpers/conversionErrors';
import type { EncoderRequest, EncoderResponse } from '@/domain/services/gif/gifEncoderProtocol';
import type { GifEncodingOptions } from '@/domain/services/gif/gifEncodingSession';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type RequestPayload = DistributiveOmit<EncoderRequest, 'id'>;

interface PendingRequest {
  resolve: (response: EncoderResponse) => void;
  reject: (error: ConversionError) => void;
}

/** Promise-based wrapper around the encoder worker. One instance encodes one GIF. */
export class GifEncoderClient {
  private readonly worker: Worker;
  private readonly pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private disposed = false;

  private constructor() {
    this.worker = new Worker(new URL('./gifEncoder.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (event: MessageEvent<EncoderResponse>) => this.settle(event.data);
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.rejectAll(new ConversionError('conversion-failed'));
    };
  }

  static async create(options: GifEncodingOptions): Promise<GifEncoderClient> {
    const client = new GifEncoderClient();
    await client.send({ type: 'init', options });
    return client;
  }

  async setPaletteSamples(samples: ImageData[]): Promise<void> {
    const buffers = samples.map((sample) => sample.data.buffer as ArrayBuffer);
    await this.send({ type: 'palette', samples: buffers }, buffers);
  }

  /** Transfers the frame's pixel buffer to the worker; `frame` is unusable afterwards. */
  async encodeFrame(frame: ImageData, delayMs: number): Promise<void> {
    const pixels = frame.data.buffer as ArrayBuffer;
    await this.send({ type: 'frame', pixels, delayMs }, [pixels]);
  }

  async finish(): Promise<{ bytes: Uint8Array<ArrayBuffer>; frameCount: number }> {
    const response = await this.send({ type: 'finish' });
    if (response.type !== 'result') throw new ConversionError('conversion-failed');
    return { bytes: new Uint8Array(response.bytes), frameCount: response.frameCount };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.worker.terminate();
    this.rejectAll(new ConversionError('cancelled'));
  }

  private send(payload: RequestPayload, transfer: Transferable[] = []): Promise<EncoderResponse> {
    if (this.disposed) return Promise.reject(new ConversionError('cancelled'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...payload, id } as EncoderRequest, transfer);
    });
  }

  private settle(response: EncoderResponse): void {
    const request = this.pending.get(response.id);
    if (!request) return;
    this.pending.delete(response.id);
    if (response.type === 'error') {
      request.reject(new ConversionError(response.code, response.message));
    } else {
      request.resolve(response);
    }
  }

  private rejectAll(error: ConversionError): void {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}
