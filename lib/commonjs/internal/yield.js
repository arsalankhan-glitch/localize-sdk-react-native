"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yieldToEventLoop = yieldToEventLoop;
exports.sleep = sleep;
/** Yield to the event loop so long cache writes never hold the JS thread for more than one step. */
function yieldToEventLoop() {
    const g = globalThis;
    return new Promise((resolve) => {
        if (typeof g.setImmediate === 'function')
            g.setImmediate(resolve);
        else
            setTimeout(resolve, 0);
    });
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
