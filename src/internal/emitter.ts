export type Listener = () => void;

/** Minimal listener set. Iterates over a copy so unsubscribing during notify is safe. */
export class Emitter {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(): void {
    for (const l of Array.from(this.listeners)) {
      try {
        l();
      } catch {
        // a throwing subscriber must not block the others
      }
    }
  }

  get size(): number {
    return this.listeners.size;
  }

  clear(): void {
    this.listeners.clear();
  }
}
