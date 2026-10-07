import type { LocalizeSource } from './LocalizeConfig';

export interface GetStringOptions {
  /** Positional args for %s / %d / %@. */
  args?: readonly unknown[];
  /** Named args for {{name}} / {name}. Applied after positional args. */
  named?: Readonly<Record<string, unknown>>;
}

/** Either positional args, or options with positional and/or named args. */
export type StringArgs = readonly unknown[] | GetStringOptions;

export interface InitResult {
  source: LocalizeSource;
  locales: string[];
}

/** What the React layer needs; implemented by the static LocalizeSDK and by every client. */
export interface LocalizeHandle {
  subscribe(listener: () => void): () => void;
  getVersion(): number;
  getString(key: string, args?: StringArgs): string;
  getPlural(key: string, count: number): string;
  getLocale(): string;
  setLocale(locale: string): Promise<void>;
  refresh(): Promise<boolean>;
  isRTL(locale?: string): boolean;
  getSource(): LocalizeSource;
  isReady(): boolean;
  whenReady(): Promise<unknown>;
}
