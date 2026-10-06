import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(dir, '.out', 'run-tests.cjs');

rmSync(path.join(dir, '.out'), { recursive: true, force: true });
mkdirSync(path.join(dir, '.out'), { recursive: true });

await build({
  entryPoints: [ path.join(dir, 'run-tests.ts') ],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile,
  alias: {
    obsidian: path.join(dir, 'obsidian-stub.ts'),
  },
  logLevel: 'warning',
});

const result = spawnSync(process.execPath, [ outfile ], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
