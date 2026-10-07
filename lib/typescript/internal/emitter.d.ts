export type Listener = () => void;
/** Minimal listener set. Iterates over a copy so unsubscribing during notify is safe. */
export declare class Emitter {
    private listeners;
    subscribe(listener: Listener): () => void;
    emit(): void;
    get size(): number;
    clear(): void;
}
