"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileSystemAdapter = fileSystemAdapter;
const optional_1 = require("../../internal/optional");
/**
 * Real files: `{cacheDirectory}/{key}.json`, i.e. `localize_{hash8}_{platform}_{locale}.json`,
 * the same name and format as the iOS / Android / Flutter caches.
 * Uses expo-file-system if installed, else react-native-fs. Returns null if neither is available.
 */
function fileSystemAdapter(options = {}) {
    const expo = (0, optional_1.expoFileSystem)();
    if (expo) {
        const dir = withSlash(options.directory ?? expo.cacheDirectory ?? '');
        if (!dir)
            return null;
        const uri = (key) => `${dir}${key}.json`;
        return {
            async getItem(key) {
                const info = await expo.getInfoAsync(uri(key));
                return info.exists ? expo.readAsStringAsync(uri(key)) : null;
            },
            setItem: (key, value) => expo.writeAsStringAsync(uri(key), value),
            removeItem: (key) => expo.deleteAsync(uri(key), { idempotent: true }),
            async getAllKeys() {
                return stripJson(await expo.readDirectoryAsync(dir));
            },
        };
    }
    const rnfs = (0, optional_1.reactNativeFS)();
    if (rnfs) {
        const dir = withSlash(options.directory ?? rnfs.CachesDirectoryPath);
        const path = (key) => `${dir}${key}.json`;
        return {
            async getItem(key) {
                return (await rnfs.exists(path(key))) ? rnfs.readFile(path(key), 'utf8') : null;
            },
            setItem: (key, value) => rnfs.writeFile(path(key), value, 'utf8'),
            async removeItem(key) {
                if (await rnfs.exists(path(key)))
                    await rnfs.unlink(path(key));
            },
            async getAllKeys() {
                return stripJson(await rnfs.readdir(dir));
            },
        };
    }
    return null;
}
function withSlash(dir) {
    return dir && !dir.endsWith('/') ? `${dir}/` : dir;
}
function stripJson(names) {
    return names.filter((n) => n.endsWith('.json')).map((n) => n.slice(0, -'.json'.length));
}
