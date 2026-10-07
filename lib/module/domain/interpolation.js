const POSITIONAL = /%[sd@]/g;
const NAMED = /\{\{\s*([\w.]+)\s*\}\}|\{([\w.]+)\}/g;
/**
 * Replace %s, %d, %@ with args in order of appearance, in a single left-to-right pass.
 * Substituted text is never re-scanned. Extra placeholders stay literal; extra args are ignored.
 */
export function interpolate(template, args) {
    if (args.length === 0)
        return template;
    let i = 0;
    return template.replace(POSITIONAL, (match) => (i < args.length ? String(args[i++]) : match));
}
/** Opt-in named placeholders: {{name}} and {name}. Unknown names stay literal. */
export function interpolateNamed(template, named) {
    return template.replace(NAMED, (match, a, b) => {
        const name = (a ?? b);
        return Object.prototype.hasOwnProperty.call(named, name) ? String(named[name]) : match;
    });
}
