export type MermaidSvgRenderer = (code: string, signal?: AbortSignal) => Promise<string>;

let counter = 0;

let defaultRenderer: MermaidSvgRenderer | null = null;

/**
 * Lazily loads the bundled mermaid library on first use. Obsidian runs
 * in a full DOM environment, so diagrams are rendered to standalone SVG
 * at publish time and embedded into the post — no WordPress-side
 * mermaid plugin is needed.
 */
/**
 * How long a single diagram may take to render before it is treated
 * as failed and the original fence is kept.
 */
const RENDER_TIMEOUT_MS = 15000;

async function getDefaultRenderer(): Promise<MermaidSvgRenderer> {
  if (defaultRenderer === null) {
    defaultRenderer = async (code: string, signal?: AbortSignal): Promise<string> => {
      if (typeof document === 'undefined') {
        throw new Error('Mermaid rendering requires a DOM environment.');
      }
      const { default: mermaid } = await import('mermaid');
      if (signal?.aborted) throw new Error('Mermaid rendering cancelled.');
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'default',
        // Mermaid 12 gives this global option precedence over the deprecated
        // flowchart.htmlLabels setting. Use SVG text labels for portability.
        htmlLabels: false,
        suppressErrorRendering: true,
      });
      const container = document.createElement('div');
      container.style.cssText = 'position:absolute;left:-10000px;top:0;';
      document.body.appendChild(container);
      const cleanup = () => container.remove();
      signal?.addEventListener('abort', cleanup, {once:true});
      try {
        const { svg } = await mermaid.render(`ob-mermaid-svg-${++counter}`, code, container);
        return svg;
      } finally {
        signal?.removeEventListener('abort', cleanup);
        cleanup();
      }
    };
  }
  return defaultRenderer;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout();
      reject(new Error(`render timed out after ${ms}ms`));
    }, ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

interface MermaidFenceBlock {
  startLine: number;
  endLine: number;
  code: string;
}

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*([^`\s].*)?$/;

/**
 * Finds fenced mermaid blocks in the raw note content.
 *
 * The scan is line-based (instead of regex based) so that nested or
 * adjacent fences are handled correctly.
 */
export function findMermaidFences(content: string): MermaidFenceBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: MermaidFenceBlock[] = [];
  let open: { mark: string, start: number, isMermaid: boolean } | null = null;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(FENCE_RE);
    if (!match) {
      if (open !== null && open.isMermaid) {
        codeLines.push(lines[i]);
      }
      continue;
    }
    const mark = match[1];
    if (open === null) {
      const info = (match[2] ?? '').trim();
      open = { mark, start: i, isMermaid: info === 'mermaid' };
      codeLines = [];
    } else if (mark[0] === open.mark[0] && mark.length >= open.mark.length) {
      // closing fence of the same kind
      if (open.isMermaid) {
        blocks.push({
          startLine: open.start,
          endLine: i,
          code: codeLines.join('\n'),
        });
      }
      open = null;
      codeLines = [];
    } else if (open.isMermaid) {
      codeLines.push(lines[i]);
    }
  }
  // an unterminated fence is left to the markdown parser as-is
  return blocks;
}

export interface MermaidRenderResult {
  content: string;
  svgs: Map<string, string>;

  /**
   * Number of diagrams successfully rendered to SVG.
   */
  rendered: number;

  /**
   * First lines of the diagrams which failed to render. Their original
   * code fences are kept in the content.
   */
  failed: string[];
}

/**
 * Renders all fenced mermaid diagrams into standalone SVG at publish
 * time, replacing each fence with a placeholder fence which the
 * markdown-it mermaid plugin turns into the inline SVG.
 *
 * @param renderSvg injectable for tests; defaults to the bundled mermaid
 */
export async function renderMermaidDiagrams(
  content: string,
  renderSvg?: MermaidSvgRenderer
): Promise<MermaidRenderResult> {
  const blocks = findMermaidFences(content);
  const svgs = new Map<string, string>();
  if (blocks.length === 0) {
    return { content, svgs, rendered: 0, failed: [] };
  }

  const render = renderSvg ?? await getDefaultRenderer();

  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const failed: string[] = [];
  let rendered = 0;

  // replace from the last block to keep the earlier line indices valid
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    const controller = new AbortController();
    try {
      const rawSvg = await withTimeout(render(block.code, controller.signal), RENDER_TIMEOUT_MS, () => controller.abort());
      // Keep the payload compact. The fence renderer also wraps it in pre:
      // single-line SVG alone cannot prevent wpautop splitting style tags.
      const svg = rawSvg.replace(/\r?\n/g, '');
      const placeholder = `ob-mermaid-${++counter}`;
      svgs.set(placeholder, svg);
      lines.splice(block.startLine, block.endLine - block.startLine + 1, '```ob-mermaid', placeholder, '```');
      rendered++;
    } catch {
      failed.push(block.code.trim().split('\n')[0] ?? 'diagram');
    }
  }

  return { content: lines.join(eol), svgs, rendered, failed };
}
