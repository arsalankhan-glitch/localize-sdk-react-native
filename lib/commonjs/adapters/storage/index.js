"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryStorageAdapter = exports.fileSystemAdapter = exports.asyncStorageAdapter = void 0;
exports.defaultStorage = defaultStorage;
const logger_1 = require("../../internal/logger");
const asyncStorage_1 = require("./asyncStorage");
Object.defineProperty(exports, "asyncStorageAdapter", { enumerable: true, get: function () { return asyncStorage_1.asyncStorageAdapter; } });
const fileSystem_1 = require("./fileSystem");
Object.defineProperty(exports, "fileSystemAdapter", { enumerable: true, get: function () { return fileSystem_1.fileSystemAdapter; } });
const memory_1 = require("./memory");
Object.defineProperty(exports, "memoryStorageAdapter", { enumerable: true, get: function () { return memory_1.memoryStorageAdapter; } });
/**
 * Default order: expo-file-system / react-native-fs → files; AsyncStorage;
 * otherwise memory (no persistence) with one dev warning.
 */
function defaultStorage() {
    const fs = (0, fileSystem_1.fileSystemAdapter)();
    if (fs)
        return fs;
    const as = (0, asyncStorage_1.asyncStorageAdapter)();
    if (as)
        return as;
    (0, logger_1.devWarn)('No storage module found (expo-file-system, react-native-fs or AsyncStorage). ' +
        'Keys will not be cached across launches.');
    return (0, memory_1.memoryStorageAdapter)();
}
