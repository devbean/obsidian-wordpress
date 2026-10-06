import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { build } from 'esbuild';

// Exercise the distributed bundle, whose imports run before Plugin.onload.
await build({
  entryPoints: ['test/obsidian-stub.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'test/.out/startup-sdk.cjs',
  logLevel: 'warning',
});
const require = createRequire(import.meta.url);
const sdk = require('./.out/startup-sdk.cjs');
const source = readFileSync('main.js', 'utf8');

for (const hostMathJax of [
  undefined,
  { version: '4.0.0', loader: {} },
  { version: '3.2.2', loader: { preLoad() { throw new Error('Host loader must not be called'); } } },
]) {
  const context = vm.createContext({
    require: id => id === 'obsidian' ? sdk : require(id),
    console, crypto: globalThis.crypto, TextEncoder, TextDecoder, Buffer,
    btoa, atob, setTimeout, clearTimeout, setInterval, clearInterval,
    MathJax: hostMathJax,
  });
  context.window = context;
  context.global = context;
  const loader = hostMathJax?.loader;
  const preLoad = loader?.preLoad;
  for (let cycle = 0; cycle < 2; cycle++) {
    const module = { exports: {} };
    const evaluate = vm.runInContext(
      `(function(require, module, exports) {${source}\n})`, context,
      { filename: 'plugin:obsidian-wordpress' },
    );
    evaluate(context.require, module, module.exports);
    const plugin = new module.exports.default();
    plugin.app = { workspace: { on() { return {}; } } };
    plugin.loadData = async () => ({ version: '2', profiles: [], showRibbonIcon: false });
    plugin.saveData = async () => { throw new Error('Unexpected settings write'); };
    await plugin.onload();
    assert.equal(plugin.commands.length, 3);
    plugin.onunload();
    assert.equal(context.MathJax, hostMathJax);
    assert.equal(hostMathJax?.loader, loader);
    assert.equal(loader?.preLoad, preLoad);
  }
}
console.log('Production bundle: load/unload/reload passed for 3 host MathJax states.');
