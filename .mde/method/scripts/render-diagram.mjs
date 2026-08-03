// MDE — render a Graphviz DOT diagram to SVG.
//
// Usage:
//   node .mde/method/scripts/render-diagram.mjs <input.dot> [output.svg]
//
// Renders <input.dot> to SVG with real edge-crossing minimization. Two backends,
// tried in order:
//   1. native Graphviz `dot` on PATH (fastest), else
//   2. the bundled WASM Graphviz (@hpcc-js/wasm) shipped with the method — so a
//      machine without Graphviz installed still renders the SVG, no system install.
//
// Only if BOTH are unavailable does it exit non-zero so the caller records a
// verification debt rather than fabricating an SVG. If the output path is omitted
// it is the input with a .svg extension.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const input = process.argv[2];
if (!input) {
  console.error('usage: render-diagram.mjs <input.dot> [output.svg]');
  process.exit(2);
}
if (!existsSync(input)) {
  console.error(`ERROR: DOT source not found: ${input}`);
  process.exit(2);
}
const output = process.argv[3] || input.replace(/\.dot$/i, '') + '.svg';

// 1) Native Graphviz `dot`, if present.
const probe = spawnSync('dot', ['-V'], { encoding: 'utf8' });
if (!probe.error) {
  const res = spawnSync('dot', ['-Tsvg', input, '-o', output], { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(`ERROR: dot failed rendering ${input}:\n${res.stderr || res.stdout}`);
    process.exit(res.status || 1);
  }
  console.log(`  rendered ${path.basename(output)} (from ${path.basename(input)}) [graphviz]`);
  process.exit(0);
}

// 2) WASM Graphviz fallback. Resolve @hpcc-js/wasm relative to this script's
//    install root (.mde/method/scripts -> install root node_modules), so it works
//    regardless of the project's own dependencies.
const here = path.dirname(fileURLToPath(import.meta.url));
let GraphvizMod;
// Resolve @hpcc-js/wasm-graphviz from, in order: the script's own location, the
// install root (where the shared method + its deps live — read from the project's
// .mde/install-root.txt), or the project cwd. In a project, the script is a mirror
// whose node_modules walk-up misses the install root, so the install root must be
// searched explicitly.
const bases = [here];
try {
  const installRoot = readFileSync(path.join(process.cwd(), '.mde', 'install-root.txt'), 'utf8').trim();
  if (installRoot) bases.push(installRoot, path.join(installRoot, '..'));
} catch { /* no install-root.txt — fine */ }
bases.push(process.cwd());

for (const base of bases) {
  try {
    const require = createRequire(path.join(base, 'noop.js'));
    const resolved = require.resolve('@hpcc-js/wasm-graphviz');
    // import() needs a file:// URL for an absolute path on Windows.
    GraphvizMod = await import(pathToFileURL(resolved).href);
    break;
  } catch { /* try next base */ }
}

if (!GraphvizMod) {
  console.error(
    'ERROR: no Graphviz backend available.\n' +
    '       Neither the native `dot` tool nor the bundled WASM Graphviz\n' +
    '       (@hpcc-js/wasm-graphviz) could be loaded. Install Graphviz\n' +
    '       (https://graphviz.org/download/) or run `npm i @hpcc-js/wasm-graphviz`\n' +
    '       in the install root. Until then this render is a verification debt.'
  );
  process.exit(3);
}

try {
  const { Graphviz } = GraphvizMod;
  const gv = await Graphviz.load();
  const svg = gv.layout(readFileSync(input, 'utf8'), 'svg', 'dot');
  writeFileSync(output, svg);
  console.log(`  rendered ${path.basename(output)} (from ${path.basename(input)}) [wasm]`);
} catch (e) {
  console.error(`ERROR: WASM Graphviz failed rendering ${input}: ${e.message}`);
  process.exit(1);
}
