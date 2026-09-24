import { type LocalizeError, type ResolvedConfig } from '../LocalizeConfig';
import { type LocalizeStore } from '../domain/LocalizeStore';
export type FetchResult = {
    ok: true;
    store: LocalizeStore;
} | {
    ok: false;
    error: LocalizeError;
    retryable: boolean;
    retryAfterMs?: number;
};
export interface LocalizeFetcher {
    fetch(timeoutMs: number): Promise<FetchResult>;
}
/** GET {baseUrl}/sdk/export?platform={platform} with X-API-Key. */
export declare class HttpLocalizeFetcher implements LocalizeFetcher {
    private readonly config;
    readonly url: string;
    constructor(config: ResolvedConfig);
    private headers;
    private headersForLog;
    private log;
    fetch(timeoutMs: number): Promise<FetchResult>;
    private parse;
}
/** Exponential backoff with jitter; only retryable failures (network, timeout, 5xx, 429). */
export declare function fetchWithRetry(fetcher: LocalizeFetcher, timeoutMs: number, retry: {
    attempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}): Promise<FetchResult>;
