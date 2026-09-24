import {
  resolveConfig,
  type LocalizeConfigInput,
  type LocalizeSource,
  type ResolvedConfig,
} from '../LocalizeConfig';
import { LocalizeCache } from '../adapters/cache';
import { detectDeviceLocale, normalizeLocale } from '../adapters/deviceLocale';
import { fetchWithRetry, HttpLocalizeFetcher, type LocalizeFetcher } from '../adapters/fetcher';
import { defaultLocalLoader } from '../adapters/loader';
import { defaultStorage } from '../adapters/storage';
import type { LocalizeStorage } from '../adapters/storage/types';
import { interpolate, interpolateNamed } from '../domain/interpolation';
import {
  EMPTY_STORE,
  extractLocale,
  hasNoKeys,
  isStoreEmpty,
  mergeStores,
  storeLocales,
  type LocalizeStore,
} from '../domain/LocalizeStore';
import { resolveStore } from '../domain/LocalizeResolver';
import { selectPluralForm, selectPluralFormIntl } from '../domain/plural';
import { Emitter } from '../internal/emitter';
import { devWarn, safeCall } from '../internal/logger';
import { netInfo, reactNative } from '../internal/optional';
import { isRTL as isRTLLocale } from '../internal/rtl';
import type { InitResult, LocalizeHandle, StringArgs } from '../types';

export interface LocalizeDependencies {
  fetcher?: LocalizeFetcher;
  storage?: LocalizeStorage | null;
}

/** Internal SDK implementation. Use LocalizeSDK or createLocalizeClient for the public API. */
export class LocalizeSDKImpl implements LocalizeHandle {
  readonly config: ResolvedConfig;
  private readonly fetcher: LocalizeFetcher;
  private readonly cache: LocalizeCache;

  private store: LocalizeStore = EMPTY_STORE;
  private locale = 'en';
  private source: LocalizeSource = 'none';
  private version = 0;
  private readonly emitter = new Emitter();

  private initPromise: Promise<InitResult> | null = null;
  private inflight: Promise<boolean> | null = null;
  private ready = false;
  private disposed = false;
  /** Bumped by every setLocale; stale locale loads are discarded. */
  private localeToken = 0;
  /** Bumped by every applied API response; older cache/bundle loads are discarded. */
  private apiEpoch = 0;
  private lastFetchAt = 0;
  private readonly preloaded = new Map<string, LocalizeStore>();
  private readonly disposers: Array<() => void> = [];

  constructor(input: LocalizeConfigInput, deps: LocalizeDependencies = {}) {
    this.config = resolveConfig(input);
    this.fetcher = deps.fetcher ?? new HttpLocalizeFetcher(this.config);
    const storage =
      deps.storage !== undefined ? deps.storage : input.storage === false ? null : (input.storage ?? defaultStorage());
    this.cache = new LocalizeCache(storage, this.config.apiKey, this.config.platform);
  }

  // ── lifecycle ────────────────────────────────────────────────────

  /** Idempotent. Resolves once a first store is in memory. Never throws. */
  init(): Promise<InitResult> {
    this.initPromise ??= this.runInit();
    return this.initPromise;
  }

  private async runInit(): Promise<InitResult> {
    this.locale = await this.initialLocale();
    const token = this.localeToken;
    const { initStrategy, initTimeoutMs, cacheTtlSeconds } = this.config;

    if (initStrategy === 'api-first') {
      const ok = await this.startFetch(initTimeoutMs, { attempts: 0, baseDelayMs: 0, maxDelayMs: 0 }, false);
      if (!ok) await this.applyCacheOrBundle(token);
    } else {
      await this.applyCacheOrBundle(token);
      const age = cacheTtlSeconds > 0 && this.source === 'cache' ? await this.cache.age() : null;
      const fresh = age !== null && age < cacheTtlSeconds * 1000;
      if (!fresh) void this.startFetch(this.config.timeoutSeconds * 1000, this.config.retry, true);
    }

    this.ready = true;
    this.reconcileRTL();
    this.installLifecycleListeners();
    safeCall(this.config.input.onReady);
    return { source: this.source, locales: storeLocales(this.store) };
  }

  private async initialLocale(): Promise<string> {
    const { input } = this.config;
    const norm = (l: string) => normalizeLocale(l, input.supportedLocales, input.fallbackLocale);
    if (input.locale) return norm(input.locale);
    if (this.config.persistLocale) {
      const persisted = await this.cache.loadPersistedLocale();
      if (persisted) return norm(persisted);
    }
    if (this.config.detectDeviceLocale) {
      const detected = detectDeviceLocale(input.deviceLocaleProvider);
      if (detected) return norm(detected);
    }
    return norm('en');
  }

  /** Cache for the current locale (+ fallback), else the bundled store. */
  private async applyCacheOrBundle(token: number): Promise<void> {
    const epoch = this.apiEpoch;
    const cached = await this.loadCached(this.locale);
    let store: LocalizeStore;
    let source: LocalizeSource;
    if (cached) {
      store = cached;
      source = 'cache';
    } else {
      const local = await this.loadLocal();
      store = resolveStore(null, local);
      source = isStoreEmpty(store) ? 'none' : 'bundle';
    }
    if (epoch !== this.apiEpoch || token !== this.localeToken || this.disposed) return;
    this.applyStore(store, source);
  }

  private async loadCached(locale: string): Promise<LocalizeStore | null> {
    const primary = this.preloaded.get(locale) ?? (await this.cache.load(locale));
    if (!primary) return null;
    const fb = this.config.input.fallbackLocale;
    if (!fb || fb === locale) return primary;
    const fallback = this.preloaded.get(fb) ?? (await this.cache.load(fb));
    return fallback ? mergeStores(fallback, primary) : primary;
  }

  private async loadLocal(): Promise<LocalizeStore | null> {
    try {
      return await (this.config.input.localLoader ?? defaultLocalLoader)();
    } catch (e) {
      devWarn(`localLoader threw: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }

  private applyStore(store: LocalizeStore, source: LocalizeSource): void {
    this.store = store;
    this.source = source;
    this.version++;
    this.emitter.emit();
    safeCall(this.config.input.onKeysUpdated);
  }

  /** One fetch at a time; concurrent callers share the in-flight promise. */
  private startFetch(
    timeoutMs: number,
    retry: ResolvedConfig['retry'],
    notifyOnFailure: boolean,
  ): Promise<boolean> {
    if (this.inflight) return this.inflight;
    const run = async (): Promise<boolean> => {
      try {
        const result = await fetchWithRetry(this.fetcher, timeoutMs, retry);
        if (this.disposed) return false;
        if (!result.ok) {
          safeCall(this.config.input.onError, result.error);
          if (notifyOnFailure) safeCall(this.config.input.onKeysUpdated);
          return false;
        }
        if (hasNoKeys(result.store)) {
          // An empty export must not wipe working strings (fixes §15.2 of the SDK plan).
          devWarn(`Export for platform '${this.config.platform}' has no keys; keeping current strings.`);
          if (notifyOnFailure) safeCall(this.config.input.onKeysUpdated);
          return false;
        }
        this.apiEpoch++;
        this.preloaded.clear();
        this.applyStore(extractLocale(result.store, this.locale, this.config.input.fallbackLocale), 'api');
        await this.cache.save(result.store);
        return true;
      } finally {
        this.inflight = null;
        this.lastFetchAt = Date.now();
      }
    };
    this.inflight = run();
    return this.inflight;
  }

  /** Re-download all keys. Resolves true when new keys were applied. */
  refresh = (): Promise<boolean> => {
    if (!this.initPromise) {
      devWarn('refresh() called before init()/configure().');
      return Promise.resolve(false);
    }
    return this.startFetch(this.config.timeoutSeconds * 1000, this.config.retry, true);
  };

  /** Switch locale. Lookups use the new locale immediately; data loads from cache (never the network). */
  setLocale = async (next: string): Promise<void> => {
    const { input } = this.config;
    const locale = normalizeLocale(next, input.supportedLocales, input.fallbackLocale);
    this.locale = locale;
    const token = ++this.localeToken;
    const epoch = this.apiEpoch;
    if (this.config.persistLocale) void this.cache.persistLocale(locale);
    this.applyRTL(locale);

    const cached = await this.loadCached(locale);
    let store = this.store;
    let source = this.source;
    if (cached) {
      store = cached;
      if (source === 'none' || source === 'bundle') source = 'cache';
    } else {
      // No cached data for this locale: merge its slice from the bundled store.
      const local = await this.loadLocal();
      const s = local?.simple[locale];
      const p = local?.plural[locale];
      if (s || p) {
        store = {
          simple: s ? { ...store.simple, [locale]: s } : store.simple,
          plural: p ? { ...store.plural, [locale]: p } : store.plural,
        };
        if (source === 'none') source = 'bundle';
      }
    }
    if (token !== this.localeToken || epoch !== this.apiEpoch || this.disposed) return;
    this.applyStore(store, source);
  };

  /** Load a locale from cache into memory ahead of setLocale. Resolves false if not cached. */
  async preloadLocale(locale: string): Promise<boolean> {
    const loaded = await this.cache.load(locale);
    if (loaded) this.preloaded.set(locale, loaded);
    return !!loaded;
  }

  async clearCache(options: { all?: boolean } = {}): Promise<void> {
    this.preloaded.clear();
    await this.cache.clear(options.all ?? false);
  }

  /** Stop listeners. The instance keeps answering lookups from memory. */
  dispose(): void {
    this.disposed = true;
    for (const d of this.disposers.splice(0)) safeCall(d);
    this.emitter.clear();
  }

  // ── lookups (synchronous) ────────────────────────────────────────

  getString = (key: string, args?: StringArgs): string => {
    const value = this.getStringOrNull(key, args);
    if (value !== null) return value;
    if (this.inPlural(key)) devWarn(`'${key}' is a plural key; use getPlural('${key}', count).`);
    return this.missing(key);
  };

  getStringOrNull = (key: string, args?: StringArgs): string | null => {
    const fb = this.config.input.fallbackLocale;
    const bundle = this.config.input.bundleFallback;
    let value: string | null | undefined = this.store.simple[this.locale]?.[key];
    if (value === undefined && fb) value = this.store.simple[fb]?.[key];
    if (value === undefined && bundle) {
      value = safeCall(bundle, this.locale, key);
      if (value == null && fb) value = safeCall(bundle, fb, key);
    }
    if (value == null) return null;
    return format(value, args);
  };

  getPlural = (key: string, count: number): string => this.getPluralOrNull(key, count) ?? this.missing(key);

  getPluralOrNull = (key: string, count: number): string | null => {
    if (!Number.isInteger(count)) {
      devWarn(`getPlural('${key}') expects an integer count; got ${count}.`);
      count = Math.trunc(count);
    }
    const fb = this.config.input.fallbackLocale;
    const form =
      this.config.pluralRules === 'intl'
        ? selectPluralFormIntl(this.locale, count)
        : selectPluralForm(this.locale, count);
    let map = this.store.plural[this.locale]?.[key];
    if (map === undefined && fb) map = this.store.plural[fb]?.[key];
    if (map) {
      const value = map[form] ?? map.other ?? Object.values(map)[0];
      if (value !== undefined) return interpolate(value, [count]);
    }
    const bundle = this.config.input.bundleFallback;
    if (bundle) {
      let value = safeCall(bundle, this.locale, key, count);
      if (value == null && fb) value = safeCall(bundle, fb, key, count);
      if (value != null) return interpolate(value, [count]);
    }
    return null;
  };

  private missing(key: string): string {
    const handled = safeCall(this.config.input.missingKeyHandler, key, this.locale);
    return typeof handled === 'string' ? handled : key;
  }

  private inPlural(key: string): boolean {
    const fb = this.config.input.fallbackLocale;
    return !!(this.store.plural[this.locale]?.[key] ?? (fb ? this.store.plural[fb]?.[key] : undefined));
  }

  hasKey = (key: string): boolean => {
    const fb = this.config.input.fallbackLocale;
    return [this.locale, ...(fb ? [fb] : [])].some(
      (l) => this.store.simple[l]?.[key] !== undefined || this.store.plural[l]?.[key] !== undefined,
    );
  };

  getAllKeys = (): string[] => {
    const fb = this.config.input.fallbackLocale;
    const keys = new Set<string>();
    for (const l of [this.locale, ...(fb ? [fb] : [])]) {
      for (const k of Object.keys(this.store.simple[l] ?? {})) keys.add(k);
      for (const k of Object.keys(this.store.plural[l] ?? {})) keys.add(k);
    }
    return Array.from(keys);
  };

  getLoadedLocales = (): string[] => storeLocales(this.store);
  getLocale = (): string => this.locale;
  getSource = (): LocalizeSource => this.source;
  getVersion = (): number => this.version;
  isReady = (): boolean => this.ready;
  whenReady = (): Promise<InitResult> => this.init();
  isRTL = (locale?: string): boolean => isRTLLocale(locale ?? this.locale);
  subscribe = (listener: () => void): (() => void) => this.emitter.subscribe(listener);

  // ── RN-only lifecycle ────────────────────────────────────────────

  private applyRTL(locale: string): void {
    if (!this.config.autoApplyRTL) return;
    const I18n = reactNative()?.I18nManager;
    if (!I18n) return;
    const want = isRTLLocale(locale);
    I18n.allowRTL?.(true);
    if (I18n.isRTL !== want) {
      I18n.forceRTL?.(want);
      safeCall(this.config.input.onRTLChangeRequiresRestart, locale);
    }
  }

  private reconcileRTL(): void {
    if (!this.config.autoApplyRTL) return;
    const I18n = reactNative()?.I18nManager;
    if (I18n && typeof I18n.isRTL === 'boolean' && I18n.isRTL !== isRTLLocale(this.locale)) {
      safeCall(this.config.input.onError, {
        kind: 'config',
        message: `Layout direction does not match locale '${this.locale}'; an app reload is required.`,
      });
    }
  }

  private installLifecycleListeners(): void {
    const seconds = this.config.refreshOnAppForegroundSeconds;
    const AppState = reactNative()?.AppState;
    if (seconds !== null && AppState?.addEventListener) {
      let previous = AppState.currentState;
      const sub = AppState.addEventListener('change', (state) => {
        const cameForward = state === 'active' && previous !== 'active';
        previous = state;
        if (cameForward && Date.now() - this.lastFetchAt >= seconds * 1000) void this.refresh();
      });
      this.disposers.push(() => sub.remove());
    }

    if (this.config.refreshOnReconnect) {
      const ni = netInfo();
      if (!ni) {
        devWarn('refreshOnReconnect needs @react-native-community/netinfo.');
        return;
      }
      let wasConnected: boolean | null = null;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const unsubscribe = ni.addEventListener((state) => {
        const connected = !!state.isConnected && state.isInternetReachable !== false;
        if (wasConnected === false && connected) {
          if (timer !== undefined) clearTimeout(timer);
          timer = setTimeout(() => void this.refresh(), 1000);
        }
        wasConnected = connected;
      });
      this.disposers.push(() => {
        if (timer !== undefined) clearTimeout(timer);
        unsubscribe();
      });
    }
  }
}

function format(template: string, args: StringArgs | undefined): string {
  if (!args) return template;
  if (Array.isArray(args)) return interpolate(template, args);
  const opts = args as Exclude<StringArgs, readonly unknown[]>;
  let out = opts.args && opts.args.length > 0 ? interpolate(template, opts.args) : template;
  if (opts.named) out = interpolateNamed(out, opts.named);
  return out;
}
