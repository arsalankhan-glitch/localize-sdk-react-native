import { type LocalizeConfigInput, type LocalizeSource, type ResolvedConfig } from '../LocalizeConfig';
import { type LocalizeFetcher } from '../adapters/fetcher';
import type { LocalizeStorage } from '../adapters/storage/types';
import type { InitResult, LocalizeHandle, StringArgs } from '../types';
export interface LocalizeDependencies {
    fetcher?: LocalizeFetcher;
    storage?: LocalizeStorage | null;
}
/** Internal SDK implementation. Use LocalizeSDK or createLocalizeClient for the public API. */
export declare class LocalizeSDKImpl implements LocalizeHandle {
    readonly config: ResolvedConfig;
    private readonly fetcher;
    private readonly cache;
    private store;
    private locale;
    private source;
    private version;
    private readonly emitter;
    private initPromise;
    private inflight;
    private ready;
    private disposed;
    /** Bumped by every setLocale; stale locale loads are discarded. */
    private localeToken;
    /** Bumped by every applied API response; older cache/bundle loads are discarded. */
    private apiEpoch;
    private lastFetchAt;
    private readonly preloaded;
    private readonly disposers;
    constructor(input: LocalizeConfigInput, deps?: LocalizeDependencies);
    /** Idempotent. Resolves once a first store is in memory. Never throws. */
    init(): Promise<InitResult>;
    private runInit;
    private initialLocale;
    /** Cache for the current locale (+ fallback), else the bundled store. */
    private applyCacheOrBundle;
    private loadCached;
    private loadLocal;
    private applyStore;
    /** One fetch at a time; concurrent callers share the in-flight promise. */
    private startFetch;
    /** Re-download all keys. Resolves true when new keys were applied. */
    refresh: () => Promise<boolean>;
    /** Switch locale. Lookups use the new locale immediately; data loads from cache (never the network). */
    setLocale: (next: string) => Promise<void>;
    /** Load a locale from cache into memory ahead of setLocale. Resolves false if not cached. */
    preloadLocale(locale: string): Promise<boolean>;
    clearCache(options?: {
        all?: boolean;
    }): Promise<void>;
    /** Stop listeners. The instance keeps answering lookups from memory. */
    dispose(): void;
    getString: (key: string, args?: StringArgs) => string;
    getStringOrNull: (key: string, args?: StringArgs) => string | null;
    getPlural: (key: string, count: number) => string;
    getPluralOrNull: (key: string, count: number) => string | null;
    private missing;
    private inPlural;
    hasKey: (key: string) => boolean;
    getAllKeys: () => string[];
    getLoadedLocales: () => string[];
    getLocale: () => string;
    getSource: () => LocalizeSource;
    getVersion: () => number;
    isReady: () => boolean;
    whenReady: () => Promise<InitResult>;
    isRTL: (locale?: string) => boolean;
    subscribe: (listener: () => void) => (() => void);
    private applyRTL;
    private reconcileRTL;
    private installLifecycleListeners;
}
