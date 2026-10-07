"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLocalizeClient = createLocalizeClient;
const LocalizeSDKImpl_1 = require("./usecase/LocalizeSDKImpl");
/**
 * An independent instance (own store, cache namespace, fetcher). Use for multiple surfaces,
 * micro-apps, or isolated tests. Call `await client.init()` (or pass it to LocalizeProvider).
 */
function createLocalizeClient(config, deps) {
    return new LocalizeSDKImpl_1.LocalizeSDKImpl(config, deps);
}
