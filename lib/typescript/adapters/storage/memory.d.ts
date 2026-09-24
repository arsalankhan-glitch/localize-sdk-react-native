import type { LocalizeStorage } from './types';
/** In-memory storage: tests, SSR, and the last-resort fallback. Lost on restart. */
export declare function memoryStorageAdapter(initial?: Record<string, string>): LocalizeStorage;
