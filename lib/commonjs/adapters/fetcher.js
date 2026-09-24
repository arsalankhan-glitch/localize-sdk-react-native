"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpLocalizeFetcher = void 0;
exports.fetchWithRetry = fetchWithRetry;
const LocalizeConfig_1 = require("../LocalizeConfig");
const LocalizeStore_1 = require("../domain/LocalizeStore");
const logger_1 = require("../internal/logger");
const yield_1 = require("../internal/yield");
/** GET {baseUrl}/sdk/export?platform={platform} with X-API-Key. */
class HttpLocalizeFetcher {
    constructor(config) {
        this.config = config;
        this.url = `${config.baseUrl}/sdk/export?platform=${encodeURIComponent(config.platform)}`;
    }
    headers() {
        return {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',
            'User-Agent': `localize-sdk-${this.config.platform}/${LocalizeConfig_1.SDK_VERSION}`,
            ...this.config.headers,
            'X-API-Key': this.config.apiKey,
        };
    }
    headersForLog() {
        return { ...this.headers(), 'X-API-Key': this.config.apiKey ? '***' : '' };
    }
    log(entry) {
        if (this.config.enableLogging)
            console.log(entry.toPrettyString());
    }
    async fetch(timeoutMs) {
        const fetchFn = this.config.fetchImpl ?? globalThis.fetch;
        if (!fetchFn)
            return fail('network', 'fetch is not available', true);
        this.log(new logger_1.LocalizeLogEntry('GET', this.url, this.headersForLog()));
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        let timedOut = false;
        let timer;
        const timeout = new Promise((_, reject) => {
            timer = setTimeout(() => {
                timedOut = true;
                controller?.abort();
                reject(new Error(`timed out after ${timeoutMs} ms`));
            }, timeoutMs);
        });
        try {
            const response = await Promise.race([
                fetchFn(this.url, {
                    method: 'GET',
                    headers: this.headers(),
                    ...(controller ? { signal: controller.signal } : {}),
                }),
                timeout,
            ]);
            const body = await Promise.race([response.text(), timeout]);
            this.log(new logger_1.LocalizeLogEntry('GET', this.url, this.headersForLog(), response.status, body));
            return this.parse(response.status, body, response.headers?.get?.('Retry-After') ?? null);
        }
        catch (e) {
            this.log(new logger_1.LocalizeLogEntry('GET', this.url, this.headersForLog(), undefined, undefined, e));
            return timedOut
                ? fail('timeout', `Request timed out after ${timeoutMs} ms`, true)
                : fail('network', e instanceof Error ? e.message : String(e), true);
        }
        finally {
            if (timer !== undefined)
                clearTimeout(timer);
        }
    }
    parse(status, body, retryAfter) {
        const platform = this.config.platform;
        switch (true) {
            case status === 200:
                break;
            case status === 401 || status === 403:
                (0, logger_1.devWarn)(`API key rejected (${status}). Check the apiKey passed to configure().`);
                return fail('auth', `Invalid API key (${status})`, false, status);
            case status === 400:
                return fail('config', 'Bad request: platform missing or invalid', false, status);
            case status === 404:
                return fail('config', `Export endpoint not found at ${this.config.baseUrl}`, false, status);
            case status === 409:
                (0, logger_1.devWarn)(`Platform '${platform}' is not accepted by the server (409). ` +
                    `Add it to the backend's valid platforms, or pass platform: 'other'.`);
                return fail('config', `Invalid platform '${platform}'`, false, status);
            case status === 429: {
                const seconds = retryAfter ? Number(retryAfter) : NaN;
                return {
                    ok: false,
                    error: { kind: 'network', status, message: 'Rate limited' },
                    retryable: true,
                    ...(Number.isFinite(seconds) ? { retryAfterMs: seconds * 1000 } : {}),
                };
            }
            case status >= 500:
                return fail('network', `Server error (${status})`, true, status);
            default:
                return fail('network', `Unexpected status ${status}`, false, status);
        }
        if (body.length === 0)
            return { ok: true, store: { simple: {}, plural: {} } };
        let json;
        try {
            json = JSON.parse(body);
        }
        catch {
            return fail('parse', 'Response is not JSON (captive portal or proxy?)', false, status);
        }
        const store = (0, LocalizeStore_1.parseLanguages)(json);
        if (!store)
            return fail('parse', 'Response has no "languages" object', false, status);
        return { ok: true, store };
    }
}
exports.HttpLocalizeFetcher = HttpLocalizeFetcher;
function fail(kind, message, retryable, status) {
    return { ok: false, error: status === undefined ? { kind, message } : { kind, status, message }, retryable };
}
/** Exponential backoff with jitter; only retryable failures (network, timeout, 5xx, 429). */
async function fetchWithRetry(fetcher, timeoutMs, retry) {
    let result = await fetcher.fetch(timeoutMs);
    for (let i = 0; i < retry.attempts && !result.ok && result.retryable; i++) {
        const backoff = Math.min(retry.maxDelayMs, retry.baseDelayMs * 2 ** i);
        const delay = result.retryAfterMs ?? backoff / 2 + Math.random() * (backoff / 2);
        await (0, yield_1.sleep)(Math.min(delay, retry.maxDelayMs));
        result = await fetcher.fetch(timeoutMs);
    }
    return result;
}
