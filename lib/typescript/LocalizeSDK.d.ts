import { type LocalizeConfigInput, type LocalizeSource } from './LocalizeConfig';
import type { InitResult, StringArgs } from './types';
import { type LocalizeDependencies } from './usecase/LocalizeSDKImpl';
/**
 * Static API, same shape as the iOS / Android / Flutter SDKs.
 *
 * ```ts
 * await LocalizeSDK.configure({ apiKey: 'pk_...', fallbackLocale: 'en' });
 * LocalizeSDK.getString('welcome_message');
 * ```
 */
export declare const LocalizeSDK: {
    /**
     * Configure once at app start. Resolves when strings are in memory (cache or bundle by default;
     * the download continues in the background). Never throws.
     * Calling again with the same apiKey + platform returns the existing instance.
     */
    configure(config: LocalizeConfigInput, deps?: LocalizeDependencies): Promise<InitResult>;
    getString(key: string, args?: StringArgs): string;
    getPlural(key: string, count: number): string;
    getStringOrNull(key: string, args?: StringArgs): string | null;
    getPluralOrNull(key: string, count: number): string | null;
    setLocale(locale: string): Promise<void>;
    getLocale(): string;
    readonly locale: string;
    /** Re-download keys. Resolves true when new keys were applied. */
    refresh(): Promise<boolean>;
    preloadLocale(locale: string): Promise<boolean>;
    clearCache(options?: {
        all?: boolean;
    }): Promise<void>;
    hasKey(key: string): boolean;
    getAllKeys(): string[];
    getLoadedLocales(): string[];
    getSource(): LocalizeSource;
    isRTL(locale?: string): boolean;
    isConfigured(): boolean;
    isReady(): boolean;
    whenReady(): Promise<unknown>;
    /** Survives re-configuration: listeners follow the current instance. */
    subscribe(listener: () => void): () => void;
    getVersion(): number;
    /** For tests: drop the configured instance and all listeners. */
    resetForTesting(): void;
};
