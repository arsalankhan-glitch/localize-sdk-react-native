export { LocalizeSDK } from './LocalizeSDK';
export { createLocalizeClient, type LocalizeClient } from './createLocalizeClient';
export {
  DEFAULT_BASE_URL,
  DEFAULT_PLATFORM,
  SDK_VERSION,
  type BundleFallback,
  type LocalBundleLoader,
  type LocalizeConfigInput,
  type LocalizeError,
  type LocalizeErrorKind,
  type LocalizeSource,
} from './LocalizeConfig';
export type { GetStringOptions, InitResult, LocalizeHandle, StringArgs } from './types';
export type { LocalizeStore } from './domain/LocalizeStore';
export type { LocalizeFetcher, FetchResult } from './adapters/fetcher';
export type { LocalizeDependencies } from './usecase/LocalizeSDKImpl';

export { selectPluralForm, type PluralForm } from './domain/plural';
export { interpolate, interpolateNamed } from './domain/interpolation';
export { isRTL } from './internal/rtl';
export { LocalizeLogEntry } from './internal/logger';

export { bundleLoader, parseLocalBundle, parseLocalBundleJson } from './adapters/loader';
export { detectDeviceLocale, normalizeLocale } from './adapters/deviceLocale';
export {
  asyncStorageAdapter,
  fileSystemAdapter,
  memoryStorageAdapter,
  type LocalizeStorage,
} from './adapters/storage';
export { jsonBundleFallback } from './adapters/bundleFallback/json';
export { i18nextBundleFallback } from './adapters/bundleFallback/i18next';
export { i18nJsBundleFallback } from './adapters/bundleFallback/i18nJs';

export { LocalizeProvider, type LocalizeProviderProps } from './react/LocalizeProvider';
export { useLocalize, useLocalizedPlural, useLocalizedString, useLocale, type UseLocalizeResult } from './react/hooks';
export { T, type TProps } from './react/T';
export { LocalizeContext } from './react/context';
