import type { LocalizeStore } from './domain/LocalizeStore';
import type { LocalizeStorage } from './adapters/storage/types';
import { isDev } from './internal/logger';

export const SDK_VERSION = '0.1.0';
export const DEFAULT_BASE_URL = 'https://localize-api.adres.ae';
export const DEFAULT_PLATFORM = 'react-native';

export type LocalizeSource = 'api' | 'cache' | 'bundle' | 'none';

export type LocalizeErrorKind = 'auth' | 'config' | 'network' | 'parse' | 'timeout';

export interface LocalizeError {
  kind: LocalizeErrorKind;
  status?: number;
  message: string;
}

export type BundleFallback = (locale: string, key: string, count?: number) => string | null | undefined;

export type LocalBundleLoader = () => Promise<LocalizeStore | null>;

export interface LocalizeConfigInput {
  // ── parity with iOS / Android / Flutter ──────────────────────────
  apiKey: string;
  /** Default 'react-native'. Shares keys with web / other / flutter on the backend. */
  platform?: string;
  /** Default 'https://localize-api.adres.ae'. Trailing slash is removed. */
  baseUrl?: string;
  fallbackLocale?: string;
  /** Timeout for background / refresh fetches. Default 10. */
  timeoutSeconds?: number;
  /** Default: on in dev builds. Never logs in release builds. */
  enableLogging?: boolean;
  onKeysUpdated?: () => void;
  /** Whole-store bundled keys, used when there is no API data and no cache. */
  localLoader?: LocalBundleLoader;
  /** Invoked once the first store is in memory (Android parity). */
  onReady?: () => void;
  /** Per-key bundled fallback, consulted after both locales miss (Flutter parity). */
  bundleFallback?: BundleFallback;

  // ── React Native only ────────────────────────────────────────────
  /** 'cache-first' (default): resolve from cache immediately, fetch in background. */
  initStrategy?: 'cache-first' | 'api-first';
  /** Caps the api-first init fetch. Default 3000. */
  initTimeoutMs?: number;
  /** Explicit initial locale; wins over persisted and detected locales. */
  locale?: string;
  /** Default false. Detect the device locale when no `locale` is given. */
  detectDeviceLocale?: boolean;
  /** Custom device-locale lookup, tried before the built-in providers. */
  deviceLocaleProvider?: () => string | null | undefined;
  /** Narrows detected / set locales: 'en-GB' → 'en' when only 'en' is supported. */
  supportedLocales?: string[];
  /** Default false. Remember the last setLocale() across launches. */
  persistLocale?: boolean;
  /** Default: auto-detected (file system → AsyncStorage → memory). false disables persistence. */
  storage?: LocalizeStorage | false;
  /** 0 (default) = always fetch on start. > 0 skips the start-up fetch while the cache is younger. */
  cacheTtlSeconds?: number;
  /** Refresh when the app returns to the foreground. true = at most every 300 s, or a number of seconds. */
  refreshOnAppForeground?: boolean | number;
  /** Refresh when connectivity returns. Requires @react-native-community/netinfo. */
  refreshOnReconnect?: boolean;
  /** Retries for network / timeout / 5xx / 429. Default { attempts: 2, baseDelayMs: 500, maxDelayMs: 4000 }. */
  retry?: { attempts?: number; baseDelayMs?: number; maxDelayMs?: number };
  /** 'sdk' (default) matches the other SDKs; 'intl' uses Intl.PluralRules. */
  pluralRules?: 'sdk' | 'intl';
  /** Called when nothing resolves. Return a string to use it instead of the key. */
  missingKeyHandler?: (key: string, locale: string) => string | void;
  onError?: (error: LocalizeError) => void;
  /** Default false. Call I18nManager.forceRTL on setLocale. */
  autoApplyRTL?: boolean;
  /** Called when autoApplyRTL changed direction; the app must reload to apply it. */
  onRTLChangeRequiresRestart?: (locale: string) => void;
  /** Replace the transport (tests, proxies). */
  fetchImpl?: typeof fetch;
  /** Extra request headers. */
  headers?: Record<string, string>;
}

export interface ResolvedConfig
  extends Required<
    Pick<
      LocalizeConfigInput,
      | 'apiKey'
      | 'platform'
      | 'baseUrl'
      | 'timeoutSeconds'
      | 'enableLogging'
      | 'initStrategy'
      | 'initTimeoutMs'
      | 'detectDeviceLocale'
      | 'persistLocale'
      | 'cacheTtlSeconds'
      | 'refreshOnReconnect'
      | 'pluralRules'
      | 'autoApplyRTL'
      | 'headers'
    >
  > {
  input: LocalizeConfigInput;
  refreshOnAppForegroundSeconds: number | null;
  retry: { attempts: number; baseDelayMs: number; maxDelayMs: number };
  fetchImpl: typeof fetch | undefined;
}

export function resolveConfig(input: LocalizeConfigInput): ResolvedConfig {
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
