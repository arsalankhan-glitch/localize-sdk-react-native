import { isDev } from './internal/logger.js';
export const SDK_VERSION = '0.1.0';
export const DEFAULT_BASE_URL = 'https://localize-api.adres.ae';
export const DEFAULT_PLATFORM = 'react-native';
export function resolveConfig(input) {
    const fg = input.refreshOnAppForeground;
    return {
        input,
        apiKey: input.apiKey.trim(),
        platform: input.platform ?? DEFAULT_PLATFORM,
        baseUrl: (input.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
        timeoutSeconds: input.timeoutSeconds ?? 10,
        enableLogging: (input.enableLogging ?? true) && isDev(),
        initStrategy: input.initStrategy ?? 'cache-first',
        initTimeoutMs: input.initTimeoutMs ?? 3000,
        detectDeviceLocale: input.detectDeviceLocale ?? false,
        persistLocale: input.persistLocale ?? false,
        cacheTtlSeconds: input.cacheTtlSeconds ?? 0,
        refreshOnAppForegroundSeconds: fg === true ? 300 : typeof fg === 'number' ? Math.max(0, fg) : null,
        refreshOnReconnect: input.refreshOnReconnect ?? false,
        retry: {
            attempts: input.retry?.attempts ?? 2,
            baseDelayMs: input.retry?.baseDelayMs ?? 500,
            maxDelayMs: input.retry?.maxDelayMs ?? 4000,
        },
        pluralRules: input.pluralRules ?? 'sdk',
        autoApplyRTL: input.autoApplyRTL ?? false,
        headers: input.headers ?? {},
        fetchImpl: input.fetchImpl,
    };
}
