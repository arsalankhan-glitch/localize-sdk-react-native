/**
 * Replace %s, %d, %@ with args in order of appearance, in a single left-to-right pass.
 * Substituted text is never re-scanned. Extra placeholders stay literal; extra args are ignored.
 */
export declare function interpolate(template: string, args: readonly unknown[]): string;
/** Opt-in named placeholders: {{name}} and {name}. Unknown names stay literal. */
export declare function interpolateNamed(template: string, named: Readonly<Record<string, unknown>>): string;
