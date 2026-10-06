import { build } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(dir, '.out'), { recursive: true });
await build({
  entryPoints: [path.join(dir, 'mermaid-browser-test.ts')],
  bundle: true,
  platform: 'browser',
  format: 'iife',
  outfile: path.join(dir, '.out', 'mermaid-browser-test.js'),
});
copyFileSync(path.join(dir, 'mermaid-browser-test.html'), path.join(dir, '.out', 'mermaid-browser-test.html'));
