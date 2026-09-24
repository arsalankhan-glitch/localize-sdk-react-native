/**
 * In-memory storage structure for O(1) lookup.
 * simple: locale → key → value
 * plural: locale → key → pluralForm → value
 */
export interface LocalizeStore {
    readonly simple: Readonly<Record<string, Readonly<Record<string, string>>>>;
    readonly plural: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>>;
}
export declare const EMPTY_STORE: LocalizeStore;
export declare function createStore(simple?: Record<string, Record<string, string>>, plural?: Record<string, Record<string, Record<string, string>>>): LocalizeStore;
export declare function isStoreEmpty(store: LocalizeStore | null | undefined): boolean;
/** True when the store has no locales, or every locale holds zero keys. */
export declare function hasNoKeys(store: LocalizeStore): boolean;
export declare function storeLocales(store: LocalizeStore): string[];
/** Keep only `locale` and, if set and different, `fallbackLocale`. Mirrors extractLocale on all SDKs. */
export declare function extractLocale(full: LocalizeStore, locale: string, fallbackLocale?: string): LocalizeStore;
/** Shallow per-locale merge; locales in `b` replace those in `a`. */
export declare function mergeStores(a: LocalizeStore, b: LocalizeStore): LocalizeStore;
/**
 * Defensive parse of the `{ languages: { [locale]: { simple, plural } } }` shape shared by the
 * export endpoint and bundled JSON files. Non-string values are dropped, not coerced.
 * Returns null when `languages` is missing or not an object.
 */
export declare function parseLanguages(json: unknown): LocalizeStore | null;
export declare function parseSimple(raw: unknown): Record<string, string>;
export declare function parsePlural(raw: unknown): Record<string, Record<string, string>>;
export declare function isObject(v: unknown): v is Record<string, unknown>;
