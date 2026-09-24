/**
 * In-memory storage structure for O(1) lookup.
 * simple: locale → key → value
 * plural: locale → key → pluralForm → value
 */
export interface LocalizeStore {
  readonly simple: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly plural: Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, string>>>>>>;
}

export const EMPTY_STORE: LocalizeStore = Object.freeze({
  simple: Object.freeze({}),
  plural: Object.freeze({}),
});

export function createStore(
  simple: Record<string, Record<string, string>> = {},
  plural: Record<string, Record<string, Record<string, string>>> = {},
): LocalizeStore {
  return { simple, plural };
}

export function isStoreEmpty(store: LocalizeStore | null | undefined): boolean {
  if (!store) return true;
  return Object.keys(store.simple).length === 0 && Object.keys(store.plural).length === 0;
}

/** True when the store has no locales, or every locale holds zero keys. */
export function hasNoKeys(store: LocalizeStore): boolean {
  for (const l of Object.keys(store.simple)) {
    if (Object.keys(store.simple[l] ?? {}).length > 0) return false;
  }
  for (const l of Object.keys(store.plural)) {
    if (Object.keys(store.plural[l] ?? {}).length > 0) return false;
  }
  return true;
}

export function storeLocales(store: LocalizeStore): string[] {
  return Array.from(new Set([...Object.keys(store.simple), ...Object.keys(store.plural)]));
}

/** Keep only `locale` and, if set and different, `fallbackLocale`. Mirrors extractLocale on all SDKs. */
export function extractLocale(
  full: LocalizeStore,
  locale: string,
  fallbackLocale?: string,
): LocalizeStore {
  const simple: Record<string, Record<string, string>> = {};
  const plural: Record<string, Record<string, Record<string, string>>> = {};
  for (const l of fallbackLocale && fallbackLocale !== locale ? [locale, fallbackLocale] : [locale]) {
    const s = full.simple[l];
    const p = full.plural[l];
    if (s) simple[l] = s as Record<string, string>;
    if (p) plural[l] = p as Record<string, Record<string, string>>;
  }
  return { simple, plural };
}

/** Shallow per-locale merge; locales in `b` replace those in `a`. */
export function mergeStores(a: LocalizeStore, b: LocalizeStore): LocalizeStore {
  return {
    simple: { ...a.simple, ...b.simple },
    plural: { ...a.plural, ...b.plural },
  };
}

/**
 * Defensive parse of the `{ languages: { [locale]: { simple, plural } } }` shape shared by the
 * export endpoint and bundled JSON files. Non-string values are dropped, not coerced.
 * Returns null when `languages` is missing or not an object.
 */
export function parseLanguages(json: unknown): LocalizeStore | null {
  if (!isObject(json)) return null;
  const languages = json.languages;
  if (!isObject(languages)) return null;

  const simple: Record<string, Record<string, string>> = {};
  const plural: Record<string, Record<string, Record<string, string>>> = {};
  for (const [locale, langData] of Object.entries(languages)) {
    if (!isObject(langData)) continue;
    simple[locale] = parseSimple(langData.simple);
    plural[locale] = parsePlural(langData.plural);
  }
  return { simple, plural };
}

export function parseSimple(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObject(raw)) return out;
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

export function parsePlural(raw: unknown): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!isObject(raw)) return out;
  for (const [key, forms] of Object.entries(raw)) {
    if (!isObject(forms)) continue;
    const mapped: Record<string, string> = {};
    for (const [form, v] of Object.entries(forms)) {
      if (typeof v === 'string') mapped[form] = v;
    }
    if (Object.keys(mapped).length > 0) out[key] = mapped;
  }
  return out;
}

export function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
