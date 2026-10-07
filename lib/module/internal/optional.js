/**
 * Lazy access to optional peers. Each require is literal and inside try/catch so Metro treats it
 * as an optional dependency and the package keeps zero hard dependencies.
 */
export function reactNative() {
    try {
        return require('react-native');
    }
    catch {
        return null;
    }
}
export function netInfo() {
    try {
        const m = require('@react-native-community/netinfo');
        return m.default ?? m;
    }
    catch {
        return null;
    }
}
export function rnLocalize() {
    try {
        return require('react-native-localize');
    }
    catch {
        return null;
    }
}
export function expoLocalization() {
    try {
        return require('expo-localization');
    }
    catch {
        return null;
    }
}
/** expo-file-system function API: `expo-file-system/legacy` (SDK 54+) or the old default export. */
export function expoFileSystem() {
    try {
        const m = require('expo-file-system/legacy');
        if (typeof m?.readAsStringAsync === 'function')
            return m;
    }
    catch {
        // not installed, or pre-SDK 54 without /legacy
    }
    try {
        const m = require('expo-file-system');
        if (typeof m?.readAsStringAsync === 'function' && m.cacheDirectory)
            return m;
    }
    catch {
        // not installed
    }
    return null;
}
export function reactNativeFS() {
    try {
        const m = require('react-native-fs');
        const fs = m.default ?? m;
        return typeof fs.writeFile === 'function' ? fs : null;
    }
    catch {
        return null;
    }
}
export function asyncStorage() {
    try {
        const m = require('@react-native-async-storage/async-storage');
        return m.default ?? m;
    }
    catch {
        return null;
    }
}
