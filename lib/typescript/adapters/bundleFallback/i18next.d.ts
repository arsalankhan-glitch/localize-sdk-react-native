import type { BundleFallback } from '../../LocalizeConfig';
interface I18nextLike {
    exists(key: string, options?: {
        lng?: string;
        count?: number;
    }): boolean;
    getFixedT(lng: string): (key: string, options?: {
        count?: number;
    }) => unknown;
}
/** Per-key fallback backed by an existing i18next / react-i18next instance. */
export declare function i18nextBundleFallback(i18n: I18nextLike): BundleFallback;
export {};
