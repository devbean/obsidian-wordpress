import MarkdownIt from 'markdown-it';

/**
 * Mermaid diagram rendering for published posts.
 *
 * Diagrams are rendered to standalone SVG at publish time by
 * `mermaid-renderer.ts`, which replaces each ```mermaid fence with an
 * ```ob-mermaid placeholder fence and passes SVGs in the render environment.
 * The renderer below then embeds the SVG in a protected pre element, so the
 * published page needs no WordPress-side mermaid plugin at all.
 *
 * Fences which were not pre-rendered (e.g. rendering failed) fall back
 * to `<pre class="mermaid">` for site-side renderers such as WP
 * Mermaid, and display as a plain code block otherwise.
 */
/**
 * wpautop inserts paragraph boundaries around style/div tags even in a
 * single-line SVG. It preserves pre contents before applying those rules,
 * so keep the complete diagram inside pre and reset the code-block styling.
 */
export function wrapMermaidSvg(svg: string): string {
  return `<pre class="ob-mermaid-diagram" style="display:block;max-width:100%;padding:0;border:0;background:transparent;white-space:normal;line-height:normal;overflow:auto;">${svg}</pre>\n`;
}

export const MarkdownItMermaidPluginInstance = {
  plugin: plugin,
}

function plugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const info = token.info.trim();
    if (info === 'ob-mermaid') {
      const svg: string | undefined = env?.mermaidSvgs?.get(token.content.trim());
      if (svg !== undefined) {
        return wrapMermaidSvg(svg);
      }
      // no pre-rendered SVG: fall through to the plain code block
    }
    if (info === 'mermaid') {
      return `<pre class="mermaid">\n${md.utils.escapeHtml(token.content)}\n</pre>\n`;
    }
    return defaultFence
      ? defaultFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };
}
