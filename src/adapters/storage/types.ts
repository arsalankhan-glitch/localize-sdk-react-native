/** Storage port. Keys look like `localize_{hash8}_{platform}_{locale}`. */
export interface LocalizeStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  /** Optional; enables clearCache(). */
  getAllKeys?(): Promise<string[]>;
}
