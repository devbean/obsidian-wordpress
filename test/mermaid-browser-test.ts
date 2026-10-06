import { renderMermaidDiagrams } from '../src/mermaid-renderer';
import MarkdownIt from 'markdown-it';
import { MarkdownItMermaidPluginInstance } from '../src/markdown-it-mermaid-plugin';

declare global {
  interface Window {
    __mermaidTestDone?: boolean;
  }
}

async function run(): Promise<void> {
  const out = document.getElementById('out') as HTMLElement;
  const render = document.getElementById('render') as HTMLElement;
  const results: string[] = [];
  try {
    // the exact diagram from the vault test note, tabs included
    const diagram = 'graph TD\n\tA[Obsidian 笔记] --> B[WordPress 插件]\n\tB --> C{语法转换}\n\tC -->|标准语法| D[直接转 HTML]\n\tC -->|Obsidian 语法| E[转换后 HTML]';

    const t0 = Date.now();
    const result = await renderMermaidDiagrams('```mermaid\n' + diagram + '\n```');
    if (result.rendered !== 1 || result.failed.length !== 0) {
      throw new Error('publish-time render failed: ' + result.failed.join(', '));
    }
    const md = new MarkdownIt().use(MarkdownItMermaidPluginInstance.plugin);
    const html = md.render(result.content, { mermaidSvgs: result.svgs });
    const svg = html.match(/<svg[\s\S]*<\/svg>/)?.[0];
    if (!svg || svg.includes('<foreignObject')) {
      throw new Error('expected standalone SVG with text labels');
    }
    const ms = Date.now() - t0;
    results.push(`render: OK in ${ms}ms, svg length=${svg.length}`);
    results.push(`foreignObject used: ${svg.includes('foreignObject')}`);
    results.push(`explicit size: width attr=${/width="([^"]*)"/.exec(svg)?.[1] ?? 'none'}, has viewBox=${svg.includes('viewBox')}`);
    render.innerHTML = html;

    // A second publish must use a fresh SVG id.
    const result2 = await renderMermaidDiagrams('```mermaid\n' + diagram + '\n```');
    const html2 = md.render(result2.content, { mermaidSvgs: result2.svgs });
    if (result2.rendered !== 1 || html === html2) {
      throw new Error('expected successful re-render with a unique SVG id');
    }
    results.push(`re-render with new id: OK, length=${html2.length}`);
    const bodyChildren = document.body.children.length;
    const invalid = await renderMermaidDiagrams('```mermaid\nthis is not a diagram\n```');
    if (invalid.failed.length !== 1 || document.body.children.length !== bodyChildren) {
      throw new Error('failed Mermaid render leaked temporary DOM');
    }
    results.push('syntax failure: fallback kept, no temporary DOM');
    // Simulate a hung library call and shorten only the publication deadline.
    const { default: mermaid } = await import('mermaid');
    const originalRender = mermaid.render;
    const originalTimer = window.setTimeout;
    mermaid.render = (() => new Promise(() => {})) as typeof mermaid.render;
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      originalTimer(handler, timeout === 15000 ? 10 : timeout, ...args)) as typeof window.setTimeout;
    try {
      const timedOut = await renderMermaidDiagrams('```mermaid\ngraph TD\nA-->B\n```');
      if (timedOut.failed.length !== 1 || document.body.children.length !== bodyChildren) {
        throw new Error('timed-out Mermaid render leaked temporary DOM');
      }
      results.push('timeout: fallback kept, no temporary DOM');
    } finally {
      mermaid.render = originalRender;
      window.setTimeout = originalTimer;
    }
  } catch (e) {
    const err = e as { message?: string; str?: string };
    results.push(`render: FAILED: ${err.message ?? String(e)} ${err.str ?? ''}`);
  }
  out.textContent = results.join(' | ');
  window.__mermaidTestDone = true;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void run());
} else {
  void run();
}
