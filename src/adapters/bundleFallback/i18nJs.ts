import type { BundleFallback } from '../../LocalizeConfig';

interface I18nJsLike {
  t(scope: string, options?: Record<string, unknown>): unknown;
}

const MISSING = '\u0000localize-missing\u0000';

/** Per-key fallback backed by an existing i18n-js instance. */
export function i18nJsBundleFallback(i18n: I18nJsLike): BundleFallback {
  return (locale, key, count) => {
    const value = i18n.t(key, {
      locale,
      defaultValue: MISSING,
      ...(count === undefined ? {} : { count }),
    });
    if (typeof value !== 'string' || value === MISSING || value.startsWith('[missing')) return null;
    return value;
  };
}
