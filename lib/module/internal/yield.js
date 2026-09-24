/** Yield to the event loop so long cache writes never hold the JS thread for more than one step. */
export function yieldToEventLoop() {
    const g = globalThis;
    return new Promise((resolve) => {
        if (typeof g.setImmediate === 'function')
            g.setImmediate(resolve);
        else
            setTimeout(resolve, 0);
    });
}
export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
