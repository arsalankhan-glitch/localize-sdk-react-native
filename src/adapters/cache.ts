import {
  isObject,
  parseLanguages,
  parsePlural,
  parseSimple,
  storeLocales,
  type LocalizeStore,
} from '../domain/LocalizeStore';
import { devWarn } from '../internal/logger';
import { sha256Hex } from '../internal/sha256';
import { yieldToEventLoop } from '../internal/yield';
import type { LocalizeStorage } from './storage/types';

export function cachePrefix(apiKey: string, platform: string): string {
  return `localize_${sha256Hex(apiKey).slice(0, 8)}_${platform}`;
}

/**
 * One entry per locale: key `localize_{hash8}_{platform}_{locale}`, value
 * `{"locale","simple","plural"}` — the same name and format as the native SDK cache files.
 * Metadata (saved time, persisted locale) lives under separate `_meta` / `_locale` keys.
 */
export class LocalizeCache {
  readonly prefix: string;

  constructor(
    private readonly storage: LocalizeStorage | null,
    apiKey: string,
    platform: string,
  ) {
    this.prefix = cachePrefix(apiKey, platform);
  }

  keyFor(locale: string): string {
    return `${this.prefix}_${locale}`;
  }

  private get metaKey() {
    return `${this.prefix}_meta`;
  }

  private get localeKey() {
    return `${this.prefix}_locale`;
  }

  /** Returns null if missing, empty or corrupted (corrupted entries are deleted). */
  async load(locale: string): Promise<LocalizeStore | null> {
    if (!this.storage) return null;
    const key = this.keyFor(locale);
    let raw: string | null;
    try {
      raw = await this.storage.getItem(key);
    } catch {
      return null;
    }
    if (raw === null) return this.tryMigrateFromLegacy(locale);
    if (raw.length === 0) return null;
    try {
      const json: unknown = JSON.parse(raw);
      if (!isObject(json)) throw new Error('not an object');
      return { simple: { [locale]: parseSimple(json.simple) }, plural: { [locale]: parsePlural(json.plural) } };
    } catch {
      await this.storage.removeItem(key).catch(() => undefined);
      return null;
    }
  }

  /** Native SDKs once wrote a single `localize_{hash8}_{platform}` file holding `{languages}`. */
  private async tryMigrateFromLegacy(locale: string): Promise<LocalizeStore | null> {
    if (!this.storage) return null;
    try {
      const raw = await this.storage.getItem(this.prefix);
      if (!raw) return null;
      const full = parseLanguages(JSON.parse(raw));
      if (!full) return null;
      await this.save(full);
      await this.storage.removeItem(this.prefix);
      const simple = full.simple[locale];
      const plural = full.plural[locale];
      return {
        simple: simple ? { [locale]: simple } : {},
        plural: plural ? { [locale]: plural } : {},
      };
    } catch {
      return null;
    }
  }

  /** One write per locale, yielding between writes. Best-effort: failures are swallowed. */
  async save(store: LocalizeStore): Promise<void> {
    if (!this.storage) return;
    let first = true;
    for (const locale of storeLocales(store)) {
      if (!first) await yieldToEventLoop();
      first = false;
      const value = JSON.stringify({
        locale,
        simple: store.simple[locale] ?? {},
        plural: store.plural[locale] ?? {},
      });
      try {
        await this.storage.setItem(this.keyFor(locale), value);
      } catch (e) {
        devWarn(`Cache write failed for '${locale}': ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    try {
      await this.storage.setItem(this.metaKey, JSON.stringify({ savedAt: Date.now() }));
    } catch {
      // best-effort
    }
  }

  /** Milliseconds since the last successful save, or null if unknown. */
  async age(): Promise<number | null> {
    if (!this.storage) return null;
    try {
      const raw = await this.storage.getItem(this.metaKey);
      const savedAt = raw ? (JSON.parse(raw) as { savedAt?: unknown }).savedAt : undefined;
      return typeof savedAt === 'number' ? Date.now() - savedAt : null;
    } catch {
      return null;
    }
  }

  async loadPersistedLocale(): Promise<string | null> {
    if (!this.storage) return null;
    try {
      return await this.storage.getItem(this.localeKey);
    } catch {
      return null;
    }
  }

  async persistLocale(locale: string): Promise<void> {
    await this.storage?.setItem(this.localeKey, locale).catch(() => undefined);
  }

  /** Remove this key+platform's entries, or every `localize_*` entry with `all`. */
  async clear(all = false): Promise<void> {
    if (!this.storage?.getAllKeys) {
      devWarn('clearCache() needs a storage adapter with getAllKeys().');
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
