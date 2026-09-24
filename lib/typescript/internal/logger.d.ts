/** True in RN dev builds; in Node/Jest, true unless NODE_ENV=production. */
export declare function isDev(): boolean;
/** Log entry for a single HTTP request/response. Same box format as the Flutter SDK. */
export declare class LocalizeLogEntry {
    readonly method: string;
    readonly url: string;
    readonly headers: Readonly<Record<string, string>>;
    readonly statusCode?: number | undefined;
    readonly responseBody?: string | undefined;
    readonly error?: unknown | undefined;
    constructor(method: string, url: string, headers: Readonly<Record<string, string>>, statusCode?: number | undefined, responseBody?: string | undefined, error?: unknown | undefined);
    toPrettyString(): string;
    toString(): string;
}
/** Dev-only warning; `once` de-duplicates by message. */
export declare function devWarn(message: string, once?: boolean): void;
export declare function resetWarningsForTesting(): void;
/** Run a user callback; never let it throw into SDK state. */
export declare function safeCall<A extends unknown[], R>(fn: ((...args: A) => R) | undefined, ...args: A): R | undefined;
