/**
 * Lazy access to optional peers. Each require is literal and inside try/catch so Metro treats it
 * as an optional dependency and the package keeps zero hard dependencies.
 */

export interface RNModule {
  AppState?: {
    currentState?: string;
    addEventListener(type: 'change', cb: (state: string) => void): { remove(): void };
  };
  I18nManager?: {
    isRTL?: boolean;
    allowRTL?(allow: boolean): void;
    forceRTL?(force: boolean): void;
  };
  NativeModules?: Record<string, { [k: string]: unknown } | undefined>;
}

export function reactNative(): RNModule | null {
  try {
    return require('react-native') as RNModule;
  } catch {
    return null;
  }
}

export interface NetInfoModule {
  addEventListener(cb: (state: { isConnected: boolean | null; isInternetReachable?: boolean | null }) => void): () => void;
}

export function netInfo(): NetInfoModule | null {
  try {
    const m = require('@react-native-community/netinfo') as { default?: NetInfoModule } & NetInfoModule;
    return m.default ?? m;
  } catch {
    return null;
  }
}

export function rnLocalize(): { getLocales(): Array<{ languageTag: string }> } | null {
  try {
    return require('react-native-localize') as { getLocales(): Array<{ languageTag: string }> };
  } catch {
    return null;
  }
}

export function expoLocalization(): { getLocales(): Array<{ languageTag: string }> } | null {
  try {
    return require('expo-localization') as { getLocales(): Array<{ languageTag: string }> };
  } catch {
    return null;
  }
}

export interface ExpoLegacyFS {
  cacheDirectory: string | null;
  readAsStringAsync(uri: string): Promise<string>;
  writeAsStringAsync(uri: string, contents: string): Promise<void>;
  deleteAsync(uri: string, opts?: { idempotent?: boolean }): Promise<void>;
  getInfoAsync(uri: string): Promise<{ exists: boolean }>;
  readDirectoryAsync(uri: string): Promise<string[]>;
}

/** expo-file-system function API: `expo-file-system/legacy` (SDK 54+) or the old default export. */
export function expoFileSystem(): ExpoLegacyFS | null {
  try {
    const m = require('expo-file-system/legacy') as ExpoLegacyFS;
    if (typeof m?.readAsStringAsync === 'function') return m;
  } catch {
    // not installed, or pre-SDK 54 without /legacy
  }
  try {
    const m = require('expo-file-system') as ExpoLegacyFS;
    if (typeof m?.readAsStringAsync === 'function' && m.cacheDirectory) return m;
  } catch {
    // not installed
  }
  return null;
}

export interface RNFSModule {
  CachesDirectoryPath: string;
  readFile(path: string, encoding: 'utf8'): Promise<string>;
  writeFile(path: string, contents: string, encoding: 'utf8'): Promise<void>;
  unlink(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  readdir(path: string): Promise<string[]>;
}

export function reactNativeFS(): RNFSModule | null {
  try {
    const m = require('react-native-fs') as { default?: RNFSModule } & RNFSModule;
    const fs = m.default ?? m;
    return typeof fs.writeFile === 'function' ? fs : null;
  } catch {
    return null;
  }
}

export interface AsyncStorageModule {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}

export function asyncStorage(): AsyncStorageModule | null {
  try {
    const m = require('@react-native-async-storage/async-storage') as { default?: AsyncStorageModule };
    return m.default ?? (m as unknown as AsyncStorageModule);
  } catch {
    return null;
  }
}
