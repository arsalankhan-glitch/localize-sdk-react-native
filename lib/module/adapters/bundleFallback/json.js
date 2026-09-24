import { selectPluralForm } from '../../domain/plural.js';
/**
 * Per-key fallback from static objects: `jsonBundleFallback({ en: { hi: 'Hi', items: { one, other } } })`.
 * Plural entries are objects keyed by plural form.
 */
export function jsonBundleFallback(bundles) {
    return (locale, key, count) => {
        const value = bundles[locale]?.[key];
        if (value === undefined)
            return null;
        if (typeof value === 'string')
            return count === undefined ? value : null;
        if (count === undefined)
            return null;
        const form = selectPluralForm(locale, count);
        return value[form] ?? value.other ?? Object.values(value)[0] ?? null;
    };
}
