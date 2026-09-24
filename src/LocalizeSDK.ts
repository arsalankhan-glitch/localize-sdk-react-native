import { DEFAULT_PLATFORM, type LocalizeConfigInput, type LocalizeSource } from './LocalizeConfig';
import { Emitter } from './internal/emitter';
import { devWarn } from './internal/logger';
import { isRTL } from './internal/rtl';
import type { InitResult, LocalizeHandle, StringArgs } from './types';
import { LocalizeSDKImpl, type LocalizeDependencies } from './usecase/LocalizeSDKImpl';

interface SingletonState {
  client: LocalizeSDKImpl | null;
  unsubscribe: (() => void) | null;
  emitter: Emitter;
  version: number;
}

// Stored on globalThis so Fast Refresh (which re-evaluates modules) keeps the configured instance.
const GLOBAL_KEY = '__LOCALIZE_SDK__';

function state(): SingletonState {
  const g = globalThis as Record<string, unknown>;
  let s = g[GLOBAL_KEY] as SingletonState | undefined;
  if (!s) {
    s = { client: null, unsubscribe: null, emitter: new Emitter(), version: 0 };
    g[GLOBAL_KEY] = s;
  }
  return s;
}

function notify(s: SingletonState): void {
  s.version++;
  s.emitter.emit();
}

function client(method: string): LocalizeSDKImpl | null {
  const c = state().client;
  if (!c) devWarn(`${method}() called before LocalizeSDK.configure().`);
  return c;
}

/**
 * Static API, same shape as the iOS / Android / Flutter SDKs.
 *
 * ```ts
 * await LocalizeSDK.configure({ apiKey: 'pk_...', fallbackLocale: 'en' });
 * LocalizeSDK.getString('welcome_message');
 * ```
 */
export const LocalizeSDK = {
  /**
   * Configure once at app start. Resolves when strings are in memory (cache or bundle by default;
   * the download continues in the background). Never throws.
   * Calling again with the same apiKey + platform returns the existing instance.
   */
  configure(config: LocalizeConfigInput, deps?: LocalizeDependencies): Promise<InitResult> {
    const s = state();
    const current = s.client;
    const platform = config.platform ?? DEFAULT_PLATFORM;
    if (current && current.config.apiKey === config.apiKey.trim() && current.config.platform === platform) {
      return current.init();
    }
    s.unsubscribe?.();
    current?.dispose();
    const next = new LocalizeSDKImpl(config, deps);
    s.client = next;
    s.unsubscribe = next.subscribe(() => notify(s));
    notify(s);
    return next.init();
  },

  getString(key: string, args?: StringArgs): string {
    return client('getString')?.getString(key, args) ?? key;
  },
  getPlural(key: string, count: number): string {
    return client('getPlural')?.getPlural(key, count) ?? key;
  },
  getStringOrNull(key: string, args?: StringArgs): string | null {
    return state().client?.getStringOrNull(key, args) ?? null;
  },
  getPluralOrNull(key: string, count: number): string | null {
    return state().client?.getPluralOrNull(key, count) ?? null;
  },
  setLocale(locale: string): Promise<void> {
    return client('setLocale')?.setLocale(locale) ?? Promise.resolve();
  },
  getLocale(): string {
    return state().client?.getLocale() ?? 'en';
  },
  get locale(): string {
    return state().client?.getLocale() ?? 'en';
  },
  /** Re-download keys. Resolves true when new keys were applied. */
  refresh(): Promise<boolean> {
    return client('refresh')?.refresh() ?? Promise.resolve(false);
  },
  preloadLocale(locale: string): Promise<boolean> {
    return state().client?.preloadLocale(locale) ?? Promise.resolve(false);
  },
  clearCache(options?: { all?: boolean }): Promise<void> {
    return state().client?.clearCache(options) ?? Promise.resolve();
  },
  hasKey(key: string): boolean {
    return state().client?.hasKey(key) ?? false;
  },
  getAllKeys(): string[] {
    return state().client?.getAllKeys() ?? [];
  },
  getLoadedLocales(): string[] {
    return state().client?.getLoadedLocales() ?? [];
  },
  getSource(): LocalizeSource {
    return state().client?.getSource() ?? 'none';
  },
  isRTL(locale?: string): boolean {
    return isRTL(locale ?? LocalizeSDK.getLocale());
  },
  isConfigured(): boolean {
    return state().client !== null;
  },
  isReady(): boolean {
    return state().client?.isReady() ?? false;
  },
  whenReady(): Promise<unknown> {
    return state().client?.whenReady() ?? Promise.resolve();
  },
  /** Survives re-configuration: listeners follow the current instance. */
  subscribe(listener: () => void): () => void {
    return state().emitter.subscribe(listener);
  },
  getVersion(): number {
    return state().version;
  },
  /** For tests: drop the configured instance and all listeners. */
  resetForTesting(): void {
    const s = state();
    s.unsubscribe?.();
    s.client?.dispose();
    s.emitter.clear();
    delete (globalThis as Record<string, unknown>)[GLOBAL_KEY];
  },
} satisfies LocalizeHandle & Record<string, unknown>;
