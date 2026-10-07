/** Yield to the event loop so long cache writes never hold the JS thread for more than one step. */
export declare function yieldToEventLoop(): Promise<void>;
export declare function sleep(ms: number): Promise<void>;
