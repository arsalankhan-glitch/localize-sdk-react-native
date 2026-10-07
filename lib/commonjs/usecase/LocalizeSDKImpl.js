"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizeSDKImpl = void 0;
const LocalizeConfig_1 = require("../LocalizeConfig");
const cache_1 = require("../adapters/cache");
const deviceLocale_1 = require("../adapters/deviceLocale");
const fetcher_1 = require("../adapters/fetcher");
const loader_1 = require("../adapters/loader");
const storage_1 = require("../adapters/storage");
const interpolation_1 = require("../domain/interpolation");
const LocalizeStore_1 = require("../domain/LocalizeStore");
const LocalizeResolver_1 = require("../domain/LocalizeResolver");
const plural_1 = require("../domain/plural");
const emitter_1 = require("../internal/emitter");
const logger_1 = require("../internal/logger");
const optional_1 = require("../internal/optional");
const rtl_1 = require("../internal/rtl");
/** Internal SDK implementation. Use LocalizeSDK or createLocalizeClient for the public API. */
class LocalizeSDKImpl {
    constructor(input, deps = {}) {
        this.store = LocalizeStore_1.EMPTY_STORE;
        this.locale = 'en';
        this.source = 'none';
        this.version = 0;
        this.emitter = new emitter_1.Emitter();
        this.initPromise = null;
        this.inflight = null;
        this.ready = false;
        this.disposed = false;
        /** Bumped by every setLocale; stale locale loads are discarded. */
        this.localeToken = 0;
        /** Bumped by every applied API response; older cache/bundle loads are discarded. */
        this.apiEpoch = 0;
        this.lastFetchAt = 0;
        this.preloaded = new Map();
        this.disposers = [];
        /** Re-download all keys. Resolves true when new keys were applied. */
        this.refresh = () => {
            if (!this.initPromise) {
                (0, logger_1.devWarn)('refresh() called before init()/configure().');
                return Promise.resolve(false);
            }
            return this.startFetch(this.config.timeoutSeconds * 1000, this.config.retry, true);
        };
        /** Switch locale. Lookups use the new locale immediately; data loads from cache (never the network). */
        this.setLocale = async (next) => {
            const { input } = this.config;
            const locale = (0, deviceLocale_1.normalizeLocale)(next, input.supportedLocales, input.fallbackLocale);
            this.locale = locale;
            const token = ++this.localeToken;
            const epoch = this.apiEpoch;
            if (this.config.persistLocale)
                void this.cache.persistLocale(locale);
            this.applyRTL(locale);
            const cached = await this.loadCached(locale);
            let store = this.store;
            let source = this.source;
            if (cached) {
                store = cached;
                if (source === 'none' || source === 'bundle')
                    source = 'cache';
            }
            else {
                // No cached data for this locale: merge its slice from the bundled store.
                const local = await this.loadLocal();
                const s = local?.simple[locale];
                const p = local?.plural[locale];
                if (s || p) {
                    store = {
                        simple: s ? { ...store.simple, [locale]: s } : store.simple,
                        plural: p ? { ...store.plural, [locale]: p } : store.plural,
                    };
                    if (source === 'none')
                        source = 'bundle';
                }
            }
            if (token !== this.localeToken || epoch !== this.apiEpoch || this.disposed)
                return;
            this.applyStore(store, source);
        };
        // ── lookups (synchronous) ────────────────────────────────────────
        this.getString = (key, args) => {
            const value = this.getStringOrNull(key, args);
            if (value !== null)
                return value;
            if (this.inPlural(key))
                (0, logger_1.devWarn)(`'${key}' is a plural key; use getPlural('${key}', count).`);
            return this.missing(key);
        };
        this.getStringOrNull = (key, args) => {
            const fb = this.config.input.fallbackLocale;
            const bundle = this.config.input.bundleFallback;
            let value = this.store.simple[this.locale]?.[key];
            if (value === undefined && fb)
                value = this.store.simple[fb]?.[key];
            if (value === undefined && bundle) {
                value = (0, logger_1.safeCall)(bundle, this.locale, key);
                if (value == null && fb)
                    value = (0, logger_1.safeCall)(bundle, fb, key);
            }
            if (value == null)
                return null;
            return format(value, args);
        };
        this.getPlural = (key, count) => this.getPluralOrNull(key, count) ?? this.missing(key);
        this.getPluralOrNull = (key, count) => {
            if (!Number.isInteger(count)) {
                (0, logger_1.devWarn)(`getPlural('${key}') expects an integer count; got ${count}.`);
                count = Math.trunc(count);
            }
            const fb = this.config.input.fallbackLocale;
            const form = this.config.pluralRules === 'intl'
                ? (0, plural_1.selectPluralFormIntl)(this.locale, count)
                : (0, plural_1.selectPluralForm)(this.locale, count);
            let map = this.store.plural[this.locale]?.[key];
            if (map === undefined && fb)
                map = this.store.plural[fb]?.[key];
            if (map) {
                const value = map[form] ?? map.other ?? Object.values(map)[0];
                if (value !== undefined)
                    return (0, interpolation_1.interpolate)(value, [count]);
            }
            const bundle = this.config.input.bundleFallback;
            if (bundle) {
                let value = (0, logger_1.safeCall)(bundle, this.locale, key, count);
                if (value == null && fb)
                    value = (0, logger_1.safeCall)(bundle, fb, key, count);
                if (value != null)
                    return (0, interpolation_1.interpolate)(value, [count]);
            }
            return null;
        };
        this.hasKey = (key) => {
            const fb = this.config.input.fallbackLocale;
            return [this.locale, ...(fb ? [fb] : [])].some((l) => this.store.simple[l]?.[key] !== undefined || this.store.plural[l]?.[key] !== undefined);
        };
        this.getAllKeys = () => {
            const fb = this.config.input.fallbackLocale;
            const keys = new Set();
            for (const l of [this.locale, ...(fb ? [fb] : [])]) {
                for (const k of Object.keys(this.store.simple[l] ?? {}))
                    keys.add(k);
                for (const k of Object.keys(this.store.plural[l] ?? {}))
                    keys.add(k);
            }
            return Array.from(keys);
        };
        this.getLoadedLocales = () => (0, LocalizeStore_1.storeLocales)(this.store);
        this.getLocale = () => this.locale;
        this.getSource = () => this.source;
        this.getVersion = () => this.version;
        this.isReady = () => this.ready;
        this.whenReady = () => this.init();
        this.isRTL = (locale) => (0, rtl_1.isRTL)(locale ?? this.locale);
        this.subscribe = (listener) => this.emitter.subscribe(listener);
        this.config = (0, LocalizeConfig_1.resolveConfig)(input);
        this.fetcher = deps.fetcher ?? new fetcher_1.HttpLocalizeFetcher(this.config);
        const storage = deps.storage !== undefined ? deps.storage : input.storage === false ? null : (input.storage ?? (0, storage_1.defaultStorage)());
        this.cache = new cache_1.LocalizeCache(storage, this.config.apiKey, this.config.platform);
    }
    // ── lifecycle ────────────────────────────────────────────────────
    /** Idempotent. Resolves once a first store is in memory. Never throws. */
    init() {
        this.initPromise ?? (this.initPromise = this.runInit());
        return this.initPromise;
    }
    async runInit() {
        this.locale = await this.initialLocale();
        const token = this.localeToken;
        const { initStrategy, initTimeoutMs, cacheTtlSeconds } = this.config;
        if (initStrategy === 'api-first') {
            const ok = await this.startFetch(initTimeoutMs, { attempts: 0, baseDelayMs: 0, maxDelayMs: 0 }, false);
            if (!ok)
                await this.applyCacheOrBundle(token);
        }
        else {
            await this.applyCacheOrBundle(token);
            const age = cacheTtlSeconds > 0 && this.source === 'cache' ? await this.cache.age() : null;
            const fresh = age !== null && age < cacheTtlSeconds * 1000;
            if (!fresh)
                void this.startFetch(this.config.timeoutSeconds * 1000, this.config.retry, true);
        }
        this.ready = true;
        this.reconcileRTL();
        this.installLifecycleListeners();
        (0, logger_1.safeCall)(this.config.input.onReady);
        return { source: this.source, locales: (0, LocalizeStore_1.storeLocales)(this.store) };
    }
    async initialLocale() {
        const { input } = this.config;
        const norm = (l) => (0, deviceLocale_1.normalizeLocale)(l, input.supportedLocales, input.fallbackLocale);
        if (input.locale)
            return norm(input.locale);
        if (this.config.persistLocale) {
            const persisted = await this.cache.loadPersistedLocale();
            if (persisted)
                return norm(persisted);
        }
        if (this.config.detectDeviceLocale) {
            const detected = (0, deviceLocale_1.detectDeviceLocale)(input.deviceLocaleProvider);
            if (detected)
                return norm(detected);
        }
        return norm('en');
    }
    /** Cache for the current locale (+ fallback), else the bundled store. */
    async applyCacheOrBundle(token) {
        const epoch = this.apiEpoch;
        const cached = await this.loadCached(this.locale);
        let store;
        let source;
        if (cached) {
            store = cached;
            source = 'cache';
        }
        else {
            const local = await this.loadLocal();
            store = (0, LocalizeResolver_1.resolveStore)(null, local);
            source = (0, LocalizeStore_1.isStoreEmpty)(store) ? 'none' : 'bundle';
        }
        if (epoch !== this.apiEpoch || token !== this.localeToken || this.disposed)
            return;
        this.applyStore(store, source);
    }
    async loadCached(locale) {
        const primary = this.preloaded.get(locale) ?? (await this.cache.load(locale));
        if (!primary)
            return null;
        const fb = this.config.input.fallbackLocale;
        if (!fb || fb === locale)
            return primary;
        const fallback = this.preloaded.get(fb) ?? (await this.cache.load(fb));
        return fallback ? (0, LocalizeStore_1.mergeStores)(fallback, primary) : primary;
    }
    async loadLocal() {
        try {
            return await (this.config.input.localLoader ?? loader_1.defaultLocalLoader)();
        }
        catch (e) {
            (0, logger_1.devWarn)(`localLoader threw: ${e instanceof Error ? e.message : String(e)}`);
            return null;
        }
    }
    applyStore(store, source) {
        this.store = store;
        this.source = source;
        this.version++;
        this.emitter.emit();
        (0, logger_1.safeCall)(this.config.input.onKeysUpdated);
    }
    /** One fetch at a time; concurrent callers share the in-flight promise. */
    startFetch(timeoutMs, retry, notifyOnFailure) {
        if (this.inflight)
            return this.inflight;
        const run = async () => {
            try {
                const result = await (0, fetcher_1.fetchWithRetry)(this.fetcher, timeoutMs, retry);
                if (this.disposed)
                    return false;
                if (!result.ok) {
                    (0, logger_1.safeCall)(this.config.input.onError, result.error);
                    if (notifyOnFailure)
                        (0, logger_1.safeCall)(this.config.input.onKeysUpdated);
                    return false;
                }
                if ((0, LocalizeStore_1.hasNoKeys)(result.store)) {
                    // An empty export must not wipe working strings (fixes §15.2 of the SDK plan).
                    (0, logger_1.devWarn)(`Export for platform '${this.config.platform}' has no keys; keeping current strings.`);
                    if (notifyOnFailure)
                        (0, logger_1.safeCall)(this.config.input.onKeysUpdated);
                    return false;
                }
                this.apiEpoch++;
                this.preloaded.clear();
                this.applyStore((0, LocalizeStore_1.extractLocale)(result.store, this.locale, this.config.input.fallbackLocale), 'api');
                await this.cache.save(result.store);
                return true;
            }
            finally {
                this.inflight = null;
                this.lastFetchAt = Date.now();
            }
        };
        this.inflight = run();
        return this.inflight;
    }
    /** Load a locale from cache into memory ahead of setLocale. Resolves false if not cached. */
    async preloadLocale(locale) {
        const loaded = await this.cache.load(locale);
        if (loaded)
            this.preloaded.set(locale, loaded);
        return !!loaded;
    }
    async clearCache(options = {}) {
        this.preloaded.clear();
        await this.cache.clear(options.all ?? false);
    }
    /** Stop listeners. The instance keeps answering lookups from memory. */
    dispose() {
        this.disposed = true;
        for (const d of this.disposers.splice(0))
            (0, logger_1.safeCall)(d);
        this.emitter.clear();
    }
    missing(key) {
        const handled = (0, logger_1.safeCall)(this.config.input.missingKeyHandler, key, this.locale);
        return typeof handled === 'string' ? handled : key;
    }
    inPlural(key) {
        const fb = this.config.input.fallbackLocale;
        return !!(this.store.plural[this.locale]?.[key] ?? (fb ? this.store.plural[fb]?.[key] : undefined));
    }
    // ── RN-only lifecycle ────────────────────────────────────────────
    applyRTL(locale) {
        if (!this.config.autoApplyRTL)
            return;
        const I18n = (0, optional_1.reactNative)()?.I18nManager;
        if (!I18n)
            return;
        const want = (0, rtl_1.isRTL)(locale);
        I18n.allowRTL?.(true);
        if (I18n.isRTL !== want) {
            I18n.forceRTL?.(want);
            (0, logger_1.safeCall)(this.config.input.onRTLChangeRequiresRestart, locale);
        }
    }
    reconcileRTL() {
        if (!this.config.autoApplyRTL)
            return;
        const I18n = (0, optional_1.reactNative)()?.I18nManager;
        if (I18n && typeof I18n.isRTL === 'boolean' && I18n.isRTL !== (0, rtl_1.isRTL)(this.locale)) {
            (0, logger_1.safeCall)(this.config.input.onError, {
                kind: 'config',
                message: `Layout direction does not match locale '${this.locale}'; an app reload is required.`,
            });
        }
    }
    installLifecycleListeners() {
        const seconds = this.config.refreshOnAppForegroundSeconds;
        const AppState = (0, optional_1.reactNative)()?.AppState;
        if (seconds !== null && AppState?.addEventListener) {
            let previous = AppState.currentState;
            const sub = AppState.addEventListener('change', (state) => {
                const cameForward = state === 'active' && previous !== 'active';
                previous = state;
                if (cameForward && Date.now() - this.lastFetchAt >= seconds * 1000)
                    void this.refresh();
            });
            this.disposers.push(() => sub.remove());
        }
        if (this.config.refreshOnReconnect) {
            const ni = (0, optional_1.netInfo)();
            if (!ni) {
                (0, logger_1.devWarn)('refreshOnReconnect needs @react-native-community/netinfo.');
                return;
            }
            let wasConnected = null;
            let timer;
            const unsubscribe = ni.addEventListener((state) => {
                const connected = !!state.isConnected && state.isInternetReachable !== false;
                if (wasConnected === false && connected) {
                    if (timer !== undefined)
                        clearTimeout(timer);
                    timer = setTimeout(() => void this.refresh(), 1000);
                }
                wasConnected = connected;
            });
            this.disposers.push(() => {
                if (timer !== undefined)
                    clearTimeout(timer);
                unsubscribe();
            });
        }
    }
}
exports.LocalizeSDKImpl = LocalizeSDKImpl;
function format(template, args) {
    if (!args)
        return template;
    if (Array.isArray(args))
        return (0, interpolation_1.interpolate)(template, args);
    const opts = args;
    let out = opts.args && opts.args.length > 0 ? (0, interpolation_1.interpolate)(template, opts.args) : template;
    if (opts.named)
        out = (0, interpolation_1.interpolateNamed)(out, opts.named);
    return out;
}
