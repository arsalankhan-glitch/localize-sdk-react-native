import type { BundleFallback } from '../../LocalizeConfig';

interface I18nextLike {
  exists(key: string, options?: { lng?: string; count?: number }): boolean;
  getFixedT(lng: string): (key: string, options?: { count?: number }) => unknown;
}

/** Per-key fallback backed by an existing i18next / react-i18next instance. */
export function i18nextBundleFallback(i18n: I18nextLike): BundleFallback {
  return (locale, key, count) => {
    const opts = count === undefined ? {} : { count };
    if (!i18n.exists(key, { lng: locale, ...opts })) return null;
    const value = i18n.getFixedT(locale)(key, opts);
    return typeof value === 'string' ? value : null;
  };
}
