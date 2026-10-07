import { useSyncExternalStore } from 'react';
import { Text, type TextProps } from 'react-native';
import { useLocalizeHandle } from './context';

export interface TProps extends TextProps {
  /** Key to look up. */
  k: string;
  /** Positional args for %s / %d / %@. */
  args?: readonly unknown[];
  /** Named args for {{name}} / {name}. */
  named?: Readonly<Record<string, unknown>>;
  /** When set, resolves as a plural key. */
  count?: number;
}

/** `<T k="welcome_message" style={...} />` — a Text that updates in place when keys change. */
export function T({ k, args, named, count, ...textProps }: TProps) {
  const h = useLocalizeHandle();
  const get = () => (count === undefined ? h.getString(k, { args, named }) : h.getPlural(k, count));
  const text = useSyncExternalStore(h.subscribe, get, get);
  return <Text {...textProps}>{text}</Text>;
}
