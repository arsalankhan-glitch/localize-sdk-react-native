declare const __DEV__: boolean | undefined;

/** True in RN dev builds; in Node/Jest, true unless NODE_ENV=production. */
export function isDev(): boolean {
  if (typeof __DEV__ !== 'undefined') return !!__DEV__;
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.NODE_ENV !== 'production';
}

/** Log entry for a single HTTP request/response. Same box format as the Flutter SDK. */
export class LocalizeLogEntry {
  constructor(
    readonly method: string,
    readonly url: string,
    readonly headers: Readonly<Record<string, string>>,
    readonly statusCode?: number,
    readonly responseBody?: string,
    readonly error?: unknown,
  ) {}

  toPrettyString(): string {
    const lines: string[] = [];
    lines.push('┌─────────────────────────────────────────────────────────');
    lines.push('│ Localize SDK');
    lines.push('├─────────────────────────────────────────────────────────');
    lines.push(`│ ${this.method} ${this.url}`);
    lines.push('│');
    lines.push('│ Headers:');
    for (const [k, v] of Object.entries(this.headers)) lines.push(`│   ${k}: ${v}`);
    if (this.statusCode !== undefined) {
      lines.push('│');
      lines.push(`│ Status: ${this.statusCode}`);
    }
    if (this.responseBody) {
      lines.push('│');
      lines.push('│ Response:');
      for (const line of prettyJson(this.responseBody).split('\n')) lines.push(`│   ${line}`);
    }
    if (this.error !== undefined) {
      lines.push('│');
      lines.push('│ Error:');
      const text = this.error instanceof Error ? (this.error.stack ?? String(this.error)) : String(this.error);
      for (const line of text.split('\n')) lines.push(`│   ${line}`);
    }
    lines.push('└─────────────────────────────────────────────────────────');
    return lines.join('\n') + '\n';
  }

  toString(): string {
    return this.toPrettyString();
  }
}

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const warned = new Set<string>();

/** Dev-only warning; `once` de-duplicates by message. */
export function devWarn(message: string, once = true): void {
  if (!isDev()) return;
  if (once) {
    if (warned.has(message)) return;
    warned.add(message);
  }
  console.warn(`[LocalizeSDK] ${message}`);
}

export function resetWarningsForTesting(): void {
  warned.clear();
}

/** Run a user callback; never let it throw into SDK state. */
export function safeCall<A extends unknown[], R>(
  fn: ((...args: A) => R) | undefined,
  ...args: A
): R | undefined {
  if (!fn) return undefined;
  try {
    return fn(...args);
  } catch (e) {
    devWarn(`callback threw: ${e instanceof Error ? e.message : String(e)}`, false);
    return undefined;
  }
}
