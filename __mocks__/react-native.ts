import { createElement, type ReactNode } from 'react';

type AppStateListener = (state: string) => void;
const appStateListeners = new Set<AppStateListener>();

export const AppState = {
  currentState: 'active',
  addEventListener(_type: 'change', cb: AppStateListener) {
    appStateListeners.add(cb);
    return { remove: () => appStateListeners.delete(cb) };
  },
  /** test helper */
  __emit(state: string) {
    AppState.currentState = state;
    for (const l of Array.from(appStateListeners)) l(state);
  },
  __listenerCount() {
    return appStateListeners.size;
  },
};

export const I18nManager = {
  isRTL: false,
  allowRTL: jest.fn(),
  forceRTL: jest.fn((v: boolean) => {
    I18nManager.isRTL = v;
  }),
};

export const NativeModules: Record<string, unknown> = {};

export function Text(props: { children?: ReactNode; [k: string]: unknown }) {
  return createElement('Text', props, props.children);
}
export type TextProps = Record<string, unknown>;
