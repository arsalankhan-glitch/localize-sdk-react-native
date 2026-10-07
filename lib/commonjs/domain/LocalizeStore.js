"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_STORE = void 0;
exports.createStore = createStore;
exports.isStoreEmpty = isStoreEmpty;
exports.hasNoKeys = hasNoKeys;
exports.storeLocales = storeLocales;
exports.extractLocale = extractLocale;
exports.mergeStores = mergeStores;
exports.parseLanguages = parseLanguages;
exports.parseSimple = parseSimple;
exports.parsePlural = parsePlural;
exports.isObject = isObject;
exports.EMPTY_STORE = Object.freeze({
    simple: Object.freeze({}),
    plural: Object.freeze({}),
});
function createStore(simple = {}, plural = {}) {
    return { simple, plural };
}
function isStoreEmpty(store) {
    if (!store)
        return true;
    return Object.keys(store.simple).length === 0 && Object.keys(store.plural).length === 0;
}
/** True when the store has no locales, or every locale holds zero keys. */
function hasNoKeys(store) {
    for (const l of Object.keys(store.simple)) {
        if (Object.keys(store.simple[l] ?? {}).length > 0)
            return false;
    }
    for (const l of Object.keys(store.plural)) {
        if (Object.keys(store.plural[l] ?? {}).length > 0)
            return false;
    }
    return true;
}
function storeLocales(store) {
    return Array.from(new Set([...Object.keys(store.simple), ...Object.keys(store.plural)]));
}
/** Keep only `locale` and, if set and different, `fallbackLocale`. Mirrors extractLocale on all SDKs. */
function extractLocale(full, locale, fallbackLocale) {
    const simple = {};
    const plural = {};
    for (const l of fallbackLocale && fallbackLocale !== locale ? [locale, fallbackLocale] : [locale]) {
        const s = full.simple[l];
        const p = full.plural[l];
        if (s)
            simple[l] = s;
        if (p)
            plural[l] = p;
    }
    return { simple, plural };
}
/** Shallow per-locale merge; locales in `b` replace those in `a`. */
function mergeStores(a, b) {
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
function parseLanguages(json) {
    if (!isObject(json))
        return null;
    const languages = json.languages;
    if (!isObject(languages))
        return null;
    const simple = {};
    const plural = {};
    for (const [locale, langData] of Object.entries(languages)) {
        if (!isObject(langData))
            continue;
        simple[locale] = parseSimple(langData.simple);
        plural[locale] = parsePlural(langData.plural);
    }
    return { simple, plural };
}
function parseSimple(raw) {
    const out = {};
    if (!isObject(raw))
        return out;
    for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string')
            out[k] = v;
    }
    return out;
}
function parsePlural(raw) {
    const out = {};
    if (!isObject(raw))
        return out;
    for (const [key, forms] of Object.entries(raw)) {
        if (!isObject(forms))
            continue;
        const mapped = {};
        for (const [form, v] of Object.entries(forms)) {
            if (typeof v === 'string')
                mapped[form] = v;
        }
        if (Object.keys(mapped).length > 0)
            out[key] = mapped;
    }
    return out;
}
function isObject(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
