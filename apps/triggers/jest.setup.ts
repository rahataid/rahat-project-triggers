import { ReadableStream } from 'stream/web';
import { Blob } from 'buffer';
import { MessageChannel } from 'worker_threads';

if (typeof globalThis.ReadableStream === 'undefined') {
  globalThis.ReadableStream = ReadableStream as any;
}

if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = Blob as any;
}

if (typeof globalThis.File === 'undefined') {
  globalThis.File = class File extends Blob {
    name: string;
    lastModified: number;

    constructor(
      chunks: any[],
      name: string,
      options?: { lastModified?: number; type?: string },
    ) {
      super(chunks, options);
      this.name = name;
      this.lastModified = options?.lastModified ?? Date.now();
    }
  } as any;
}

if (typeof globalThis.MessagePort === 'undefined') {
  const { port1 } = new MessageChannel();
  globalThis.MessagePort = port1.constructor as any;
}

if (typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = class DOMException extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  } as any;
}
