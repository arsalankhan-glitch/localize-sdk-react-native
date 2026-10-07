/**
 * Lazy access to optional peers. Each require is literal and inside try/catch so Metro treats it
 * as an optional dependency and the package keeps zero hard dependencies.
 */
export interface RNModule {
    AppState?: {
        currentState?: string;
        addEventListener(type: 'change', cb: (state: string) => void): {
            remove(): void;
        };
    };
    I18nManager?: {
        isRTL?: boolean;
        allowRTL?(allow: boolean): void;
        forceRTL?(force: boolean): void;
    };
    NativeModules?: Record<string, {
        [k: string]: unknown;
    } | undefined>;
}
export declare function reactNative(): RNModule | null;
export interface NetInfoModule {
    addEventListener(cb: (state: {
        isConnected: boolean | null;
        isInternetReachable?: boolean | null;
    }) => void): () => void;
}
export declare function netInfo(): NetInfoModule | null;
export declare function rnLocalize(): {
    getLocales(): Array<{
        languageTag: string;
    }>;
} | null;
export declare function expoLocalization(): {
    getLocales(): Array<{
        languageTag: string;
    }>;
} | null;
export interface ExpoLegacyFS {
    cacheDirectory: string | null;
    readAsStringAsync(uri: string): Promise<string>;
    writeAsStringAsync(uri: string, contents: string): Promise<void>;
    deleteAsync(uri: string, opts?: {
        idempotent?: boolean;
    }): Promise<void>;
    getInfoAsync(uri: string): Promise<{
        exists: boolean;
    }>;
    readDirectoryAsync(uri: string): Promise<string[]>;
}
/** expo-file-system function API: `expo-file-system/legacy` (SDK 54+) or the old default export. */
export declare function expoFileSystem(): ExpoLegacyFS | null;
export interface RNFSModule {
    CachesDirectoryPath: string;
    readFile(path: string, encoding: 'utf8'): Promise<string>;
    writeFile(path: string, contents: string, encoding: 'utf8'): Promise<void>;
    unlink(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    readdir(path: string): Promise<string[]>;
}
export declare function reactNativeFS(): RNFSModule | null;
export interface AsyncStorageModule {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    getAllKeys(): Promise<readonly string[]>;
}
export declare function asyncStorage(): AsyncStorageModule | null;
