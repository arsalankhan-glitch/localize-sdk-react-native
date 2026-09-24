"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalizeSDK = void 0;
const LocalizeConfig_1 = require("./LocalizeConfig");
const emitter_1 = require("./internal/emitter");
const logger_1 = require("./internal/logger");
const rtl_1 = require("./internal/rtl");
const LocalizeSDKImpl_1 = require("./usecase/LocalizeSDKImpl");
// Stored on globalThis so Fast Refresh (which re-evaluates modules) keeps the configured instance.
const GLOBAL_KEY = '__LOCALIZE_SDK__';
function state() {
    const g = globalThis;
    let s = g[GLOBAL_KEY];
    if (!s) {
        s = { client: null, unsubscribe: null, emitter: new emitter_1.Emitter(), version: 0 };
        g[GLOBAL_KEY] = s;
    }
    return s;
}
function notify(s) {
    s.version++;
    s.emitter.emit();
}
function client(method) {
    const c = state().client;
    if (!c)
        (0, logger_1.devWarn)(`${method}() called before LocalizeSDK.configure().`);
    return c;
}
/**
 * Static API, same shape as the iOS / Android / Flutter SDKs.
 *
 * ```ts
 * await LocalizeSDK.configure({ apiKey: 'pk_...', fallbackLocale: 'en' });
 * LocalizeSDK.getString('welcome_message');
 * ```
 */
exports.LocalizeSDK = {
    /**
     * Configure once at app start. Resolves when strings are in memory (cache or bundle by default;
     * the download continues in the background). Never throws.
     * Calling again with the same apiKey + platform returns the existing instance.
     */
    configure(config, deps) {
        const s = state();
        const current = s.client;
        const platform = config.platform ?? LocalizeConfig_1.DEFAULT_PLATFORM;
        if (current && current.config.apiKey === config.apiKey.trim() && current.config.platform === platform) {
            return current.init();
        }
        s.unsubscribe?.();
        current?.dispose();
        const next = new LocalizeSDKImpl_1.LocalizeSDKImpl(config, deps);
        s.client = next;
        s.unsubscribe = next.subscribe(() => notify(s));
        notify(s);
        return next.init();
    },
    getString(key, args) {
        return client('getString')?.getString(key, args) ?? key;
    },
    getPlural(key, count) {
        return client('getPlural')?.getPlural(key, count) ?? key;
    },
    getStringOrNull(key, args) {
        return state().client?.getStringOrNull(key, args) ?? null;
    },
    getPluralOrNull(key, count) {
        return state().client?.getPluralOrNull(key, count) ?? null;
    },
    setLocale(locale) {
        return client('setLocale')?.setLocale(locale) ?? Promise.resolve();
    },
    getLocale() {
        return state().client?.getLocale() ?? 'en';
    },
    get locale() {
        return state().client?.getLocale() ?? 'en';
    },
    /** Re-download keys. Resolves true when new keys were applied. */
    refresh() {
        return client('refresh')?.refresh() ?? Promise.resolve(false);
    },
    preloadLocale(locale) {
        return state().client?.preloadLocale(locale) ?? Promise.resolve(false);
    },
    clearCache(options) {
        return state().client?.clearCache(options) ?? Promise.resolve();
    },
    hasKey(key) {
        return state().client?.hasKey(key) ?? false;
    },
    getAllKeys() {
        return state().client?.getAllKeys() ?? [];
    },
    getLoadedLocales() {
        return state().client?.getLoadedLocales() ?? [];
    },
    getSource() {
        return state().client?.getSource() ?? 'none';
    },
    isRTL(locale) {
        return (0, rtl_1.isRTL)(locale ?? exports.LocalizeSDK.getLocale());
    },
    isConfigured() {
        return state().client !== null;
    },
    isReady() {
        return state().client?.isReady() ?? false;
    },
    whenReady() {
        return state().client?.whenReady() ?? Promise.resolve();
    },
    /** Survives re-configuration: listeners follow the current instance. */
    subscribe(listener) {
        return state().emitter.subscribe(listener);
    },
    getVersion() {
        return state().version;
    },
    /** For tests: drop the configured instance and all listeners. */
    resetForTesting() {
        const s = state();
        s.unsubscribe?.();
        s.client?.dispose();
        s.emitter.clear();
        delete globalThis[GLOBAL_KEY];
    },
};
