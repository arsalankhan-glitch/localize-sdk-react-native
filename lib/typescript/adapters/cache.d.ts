import { type LocalizeStore } from '../domain/LocalizeStore';
import type { LocalizeStorage } from './storage/types';
export declare function cachePrefix(apiKey: string, platform: string): string;
/**
 * One entry per locale: key `localize_{hash8}_{platform}_{locale}`, value
 * `{"locale","simple","plural"}` — the same name and format as the native SDK cache files.
 * Metadata (saved time, persisted locale) lives under separate `_meta` / `_locale` keys.
 */
export declare class LocalizeCache {
    private readonly storage;
    readonly prefix: string;
    constructor(storage: LocalizeStorage | null, apiKey: string, platform: string);
    keyFor(locale: string): string;
    private get metaKey();
    private get localeKey();
    /** Returns null if missing, empty or corrupted (corrupted entries are deleted). */
    load(locale: string): Promise<LocalizeStore | null>;
    /** Native SDKs once wrote a single `localize_{hash8}_{platform}` file holding `{languages}`. */
    private tryMigrateFromLegacy;
    /** One write per locale, yielding between writes. Best-effort: failures are swallowed. */
    save(store: LocalizeStore): Promise<void>;
    /** Milliseconds since the last successful save, or null if unknown. */
    age(): Promise<number | null>;
    loadPersistedLocale(): Promise<string | null>;
    persistLocale(locale: string): Promise<void>;
    /** Remove this key+platform's entries, or every `localize_*` entry with `all`. */
    clear(all?: boolean): Promise<void>;
}
