/** Per-key fallback backed by an existing i18next / react-i18next instance. */
export function i18nextBundleFallback(i18n) {
    return (locale, key, count) => {
        const opts = count === undefined ? {} : { count };
        if (!i18n.exists(key, { lng: locale, ...opts }))
            return null;
        const value = i18n.getFixedT(locale)(key, opts);
        return typeof value === 'string' ? value : null;
    };
}
