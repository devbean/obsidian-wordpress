import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';

export function headingAnchor(title: string): string {
  return title.trim().replace(/\s+/g, '-');
}

export function subpathAnchor(subpath: string): string {
  return subpath.startsWith('^') ? subpath : headingAnchor(subpath);
}

/** Stable heading/block targets for published Obsidian wikilinks. */
export function markdownItAnchorPlugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'ob_anchors', state => {
    const used = new Set<string>();
    for (let i = 0; i < state.tokens.length; i++) {
      const token = state.tokens[i];
      if (token.type !== 'inline') continue;
      if (state.tokens[i - 1]?.type === 'heading_open') {
        const title = (token.children ?? []).map(child => {
          if (child.type === 'ob_wikilink') return child.meta?.alias ?? child.content;
          return child.type === 'text' || child.type === 'code_inline' || child.type === 'image' ? child.content : '';
        }).join('');
        const base = headingAnchor(title) || 'heading';
        let id = base;
        let suffix = 2;
        while (used.has(id)) id = `${base}-${suffix++}`;
        used.add(id);
        state.tokens[i - 1].attrSet('id', id);
      }
      const last = token.children?.[token.children.length - 1];
      const block = last?.type === 'text' ? last.content.match(/\s+\^([\w-]+)$/) : null;
      if (block && last) {
        const id = '^' + block[1];
        if (used.has(id)) continue;
        used.add(id);
        last.content = last.content.slice(0, -block[0].length);
        const anchor = new Token('html_inline', '', 0);
        anchor.content = `<span id="${md.utils.escapeHtml(id)}"></span>`;
        token.children!.push(anchor);
      }
    }
  });
}
