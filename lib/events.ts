import { EventEmitter } from 'events';

const globalForEmitter = globalThis as unknown as { emitter?: EventEmitter };

export const emitter = globalForEmitter.emitter ?? new EventEmitter();

if (!globalForEmitter.emitter) {
  globalForEmitter.emitter = emitter;
}
