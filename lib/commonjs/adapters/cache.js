"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizeCache = void 0;
exports.cachePrefix = cachePrefix;
const LocalizeStore_1 = require("../domain/LocalizeStore");
const logger_1 = require("../internal/logger");
const sha256_1 = require("../internal/sha256");
const yield_1 = require("../internal/yield");
function cachePrefix(apiKey, platform) {
    return `localize_${(0, sha256_1.sha256Hex)(apiKey).slice(0, 8)}_${platform}`;
}
/**
 * One entry per locale: key `localize_{hash8}_{platform}_{locale}`, value
 * `{"locale","simple","plural"}` — the same name and format as the native SDK cache files.
 * Metadata (saved time, persisted locale) lives under separate `_meta` / `_locale` keys.
 */
class LocalizeCache {
    constructor(storage, apiKey, platform) {
        this.storage = storage;
        this.prefix = cachePrefix(apiKey, platform);
    }
    keyFor(locale) {
        return `${this.prefix}_${locale}`;
    }
    get metaKey() {
        return `${this.prefix}_meta`;
    }
    get localeKey() {
        return `${this.prefix}_locale`;
    }
    /** Returns null if missing, empty or corrupted (corrupted entries are deleted). */
    async load(locale) {
        if (!this.storage)
            return null;
        const key = this.keyFor(locale);
        let raw;
        try {
            raw = await this.storage.getItem(key);
        }
        catch {
            return null;
        }
        if (raw === null)
            return this.tryMigrateFromLegacy(locale);
        if (raw.length === 0)
            return null;
        try {
            const json = JSON.parse(raw);
            if (!(0, LocalizeStore_1.isObject)(json))
                throw new Error('not an object');
            return { simple: { [locale]: (0, LocalizeStore_1.parseSimple)(json.simple) }, plural: { [locale]: (0, LocalizeStore_1.parsePlural)(json.plural) } };
        }
        catch {
            await this.storage.removeItem(key).catch(() => undefined);
            return null;
        }
    }
    /** Native SDKs once wrote a single `localize_{hash8}_{platform}` file holding `{languages}`. */
    async tryMigrateFromLegacy(locale) {
        if (!this.storage)
            return null;
        try {
            const raw = await this.storage.getItem(this.prefix);
            if (!raw)
                return null;
            const full = (0, LocalizeStore_1.parseLanguages)(JSON.parse(raw));
            if (!full)
                return null;
            await this.save(full);
            await this.storage.removeItem(this.prefix);
            const simple = full.simple[locale];
            const plural = full.plural[locale];
            return {
                simple: simple ? { [locale]: simple } : {},
                plural: plural ? { [locale]: plural } : {},
            };
        }
        catch {
            return null;
        }
    }
    /** One write per locale, yielding between writes. Best-effort: failures are swallowed. */
    async save(store) {
        if (!this.storage)
            return;
        let first = true;
        for (const locale of (0, LocalizeStore_1.storeLocales)(store)) {
            if (!first)
                await (0, yield_1.yieldToEventLoop)();
            first = false;
            const value = JSON.stringify({
                locale,
                simple: store.simple[locale] ?? {},
                plural: store.plural[locale] ?? {},
            });
            try {
                await this.storage.setItem(this.keyFor(locale), value);
            }
            catch (e) {
                (0, logger_1.devWarn)(`Cache write failed for '${locale}': ${e instanceof Error ? e.message : String(e)}`);
            }
        }
        try {
            await this.storage.setItem(this.metaKey, JSON.stringify({ savedAt: Date.now() }));
        }
        catch {
            // best-effort
        }
    }
    /** Milliseconds since the last successful save, or null if unknown. */
    async age() {
        if (!this.storage)
            return null;
        try {
            const raw = await this.storage.getItem(this.metaKey);
            const savedAt = raw ? JSON.parse(raw).savedAt : undefined;
            return typeof savedAt === 'number' ? Date.now() - savedAt : null;
        }
        catch {
            return null;
        }
    }
    async loadPersistedLocale() {
        if (!this.storage)
            return null;
        try {
            return await this.storage.getItem(this.localeKey);
        }
        catch {
            return null;
        }
    }
    async persistLocale(locale) {
        await this.storage?.setItem(this.localeKey, locale).catch(() => undefined);
    }
    /** Remove this key+platform's entries, or every `localize_*` entry with `all`. */
    async clear(all = false) {
        if (!this.storage?.getAllKeys) {
            (0, logger_1.devWarn)('clearCache() needs a storage adapter with getAllKeys().');
            return;
        }
        const keys = await this.storage.getAllKeys();
        const match = all ? 'localize_' : this.prefix;
        for (const k of keys) {
            if (k === this.prefix || k.startsWith(all ? match : `${match}_`)) {
                await this.storage.removeItem(k).catch(() => undefined);
            }
        }
    }
}
exports.LocalizeCache = LocalizeCache;
