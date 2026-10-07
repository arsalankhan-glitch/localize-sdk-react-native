import type { LocalizeStorage } from './types';
export interface FileSystemAdapterOptions {
    /** Directory for cache files. Default: the OS caches directory (same one the native SDKs use). */
    directory?: string;
}
/**
 * Real files: `{cacheDirectory}/{key}.json`, i.e. `localize_{hash8}_{platform}_{locale}.json`,
 * the same name and format as the iOS / Android / Flutter caches.
 * Uses expo-file-system if installed, else react-native-fs. Returns null if neither is available.
 */
export declare function fileSystemAdapter(options?: FileSystemAdapterOptions): LocalizeStorage | null;
