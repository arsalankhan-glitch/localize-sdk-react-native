// Make lib/module valid Node ESM: add explicit .js / /index.js to relative imports and mark the
// folder as "type": "module". Bundlers already accept either form; Node's ESM loader does not.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'lib', 'module');

function resolveSpecifier(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  if (fs.existsSync(`${base}.js`)) return `${spec}.js`;
  if (fs.existsSync(path.join(base, 'index.js'))) return `${spec}/index.js`;
  return spec;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) {
      const src = fs.readFileSync(full, 'utf8');
      const out = src.replace(
        /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g,
        (_, lead, q, spec) => `${lead}${q}${resolveSpecifier(full, spec)}${q}`,
      );
      if (out !== src) fs.writeFileSync(full, out);
    }
  }
}

walk(root);
fs.writeFileSync(path.join(root, 'package.json'), '{ "type": "module" }\n');
