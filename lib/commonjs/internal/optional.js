"use strict";
/**
 * Lazy access to optional peers. Each require is literal and inside try/catch so Metro treats it
 * as an optional dependency and the package keeps zero hard dependencies.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reactNative = reactNative;
exports.netInfo = netInfo;
exports.rnLocalize = rnLocalize;
exports.expoLocalization = expoLocalization;
exports.expoFileSystem = expoFileSystem;
exports.reactNativeFS = reactNativeFS;
exports.asyncStorage = asyncStorage;
function reactNative() {
    try {
        return require('react-native');
    }
    catch {
        return null;
    }
}
function netInfo() {
    try {
        const m = require('@react-native-community/netinfo');
        return m.default ?? m;
    }
    catch {
        return null;
    }
}
function rnLocalize() {
    try {
        return require('react-native-localize');
    }
    catch {
        return null;
    }
}
function expoLocalization() {
    try {
        return require('expo-localization');
    }
    catch {
        return null;
    }
}
/** expo-file-system function API: `expo-file-system/legacy` (SDK 54+) or the old default export. */
function expoFileSystem() {
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
function reactNativeFS() {
    try {
        const m = require('react-native-fs');
        const fs = m.default ?? m;
        return typeof fs.writeFile === 'function' ? fs : null;
    }
    catch {
        return null;
    }
}
function asyncStorage() {
    try {
        const m = require('@react-native-async-storage/async-storage');
        return m.default ?? m;
    }
    catch {
        return null;
    }
}
