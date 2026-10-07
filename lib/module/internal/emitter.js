/** Minimal listener set. Iterates over a copy so unsubscribing during notify is safe. */
export class Emitter {
    constructor() {
        this.listeners = new Set();
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }
    emit() {
        for (const l of Array.from(this.listeners)) {
            try {
                l();
            }
            catch {
                // a throwing subscriber must not block the others
            }
        }
    }
    get size() {
        return this.listeners.size;
    }
    clear() {
        this.listeners.clear();
    }
}
