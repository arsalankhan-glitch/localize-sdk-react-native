import type { LocalizeConfigInput } from '../src/LocalizeConfig';
import { memoryStorageAdapter } from '../src/adapters/storage/memory';
import type { LocalizeStorage } from '../src/adapters/storage/types';
import { createLocalizeClient } from '../src/createLocalizeClient';

export type Languages = Record<string, { simple?: Record<string, unknown>; plural?: Record<string, unknown> }>;

export interface FakeRequest {
  url: string;
  headers: Record<string, string>;
}

/** Fake /sdk/export server driving a fetchImpl. */
export class FakeServer {
  languages: Languages;
  status = 200;
  offline = false;
  rawBody: string | null = null;
  delayMs = 0;
  headers: Record<string, string> = {};
  requests: FakeRequest[] = [];
  private gate: Promise<void> | null = null;
  private openGate: (() => void) | null = null;

  constructor(languages: Languages = {}) {
    this.languages = languages;
  }

  /** Hold responses until release() is called. */
  hold(): void {
    this.gate = new Promise((r) => (this.openGate = r));
  }

  release(): void {
    this.openGate?.();
    this.gate = null;
  }

  fetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    this.requests.push({ url: String(input), headers });
    if (this.gate) await this.gate;
    if (this.delayMs) {
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, this.delayMs);
        init?.signal?.addEventListener('abort', () => {
          clearTimeout(t);
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      });
    }
    if (this.offline) throw new TypeError('Network request failed');
    if (headers['X-API-Key'] !== 'pk_test') return response(401, '');
    const body =
      this.rawBody ??
      (this.status === 200
        ? JSON.stringify({ platform: decodeURIComponent(String(input).split('platform=')[1] ?? ''), languages: this.languages })
        : '');
    return response(this.status, body, this.headers);
  }) as typeof fetch;
}

function response(status: number, body: string, headers: Record<string, string> = {}): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => body,
    headers: { get: (k: string) => headers[k] ?? null },
  } as unknown as Response;
}

export const EN_AR: Languages = {
  en: {
    simple: { welcome: 'Welcome', greeting: 'Hello, %s!', only_en: 'English only' },
    plural: { items: { one: '%d item', other: '%d items' } },
  },
  ar: {
    simple: { welcome: 'أهلا' },
    plural: { items: { zero: 'لا عناصر', one: 'عنصر', two: 'عنصران', few: '%d عناصر', many: '%d عنصرًا', other: '%d عنصر' } },
  },
};

export function makeClient(
  server: FakeServer,
  storage: LocalizeStorage = memoryStorageAdapter(),
  overrides: Partial<LocalizeConfigInput> = {},
) {
  return createLocalizeClient({
    apiKey: 'pk_test',
    fallbackLocale: 'en',
    fetchImpl: server.fetch,
    storage,
    enableLogging: false,
    retry: { attempts: 0 },
    ...overrides,
  });
}

/** Let pending promise chains (background fetch + cache save) settle. */
export async function flush(times = 10): Promise<void> {
  for (let i = 0; i < times; i++) await new Promise<void>((r) => setImmediate(r));
}
