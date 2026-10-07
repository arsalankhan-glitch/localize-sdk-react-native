import type { BundleFallback } from '../../LocalizeConfig';
import { selectPluralForm } from '../../domain/plural';

type Value = string | Readonly<Record<string, string>>;

/**
 * Per-key fallback from static objects: `jsonBundleFallback({ en: { hi: 'Hi', items: { one, other } } })`.
 * Plural entries are objects keyed by plural form.
 */
export function jsonBundleFallback(
  bundles: Readonly<Record<string, Readonly<Record<string, Value>>>>,
): BundleFallback {
  return (locale, key, count) => {
    const value = bundles[locale]?.[key];
    if (value === undefined) return null;
    if (typeof value === 'string') return count === undefined ? value : null;
    if (count === undefined) return null;
    const form = selectPluralForm(locale, count);
    return value[form] ?? value.other ?? Object.values(value)[0] ?? null;
  };
}
