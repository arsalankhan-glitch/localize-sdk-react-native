# Changelog

## 0.1.0

First release.

- Static `LocalizeSDK` API matching the iOS, Android and Flutter SDKs.
- `cache-first` start-up (default) with live updates through `useLocalize`, `useLocalizedString`,
  `useLocalizedPlural`, `useLocale`, `<T>` and `<LocalizeProvider>`; `api-first` optional.
- Cache entries use the native SDKs' naming and format; file-system, AsyncStorage and memory
  adapters.
- Retry with backoff, `onError`, `refreshOnAppForeground`, `refreshOnReconnect`, `cacheTtlSeconds`,
  device-locale detection, `supportedLocales`, `persistLocale`, RTL helpers.
- Bundle fallbacks for static JSON, i18next and i18n-js.
- Fixes carried over from the other SDKs' known issues: an empty export no longer wipes strings,
  concurrent `refresh()` calls share one request, interpolation is single-pass, the fallback locale
  survives `setLocale`, and stale locale loads are discarded.
