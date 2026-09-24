import type { BundleFallback } from '../../LocalizeConfig';
interface I18nJsLike {
    t(scope: string, options?: Record<string, unknown>): unknown;
}
/** Per-key fallback backed by an existing i18n-js instance. */
export declare function i18nJsBundleFallback(i18n: I18nJsLike): BundleFallback;
export {};
