import { type TextProps } from 'react-native';
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
export declare function T({ k, args, named, count, ...textProps }: TProps): import("react/jsx-runtime").JSX.Element;
