/**
 * Self-contained styles embedded into the published post when needed.
 *
 * Obsidian features converted by this plugin (callouts, task lists,
 * highlights, footnotes, highlighted code) rely on CSS classes. To make
 * the post render nicely without requiring a WordPress-side plugin or
 * theme support, the matching stylesheet is prepended to the post
 * content as a `<style>` block.
 */

const CALLOUT_COLORS: Record<string, string> = {
  note: '#4a90d9',
  info: '#4a90d9',
  todo: '#4a90d9',
  abstract: '#00a37a',
  summary: '#00a37a',
  tldr: '#00a37a',
  tip: '#00a37a',
  hint: '#00a37a',
  important: '#00a37a',
  success: '#23a55a',
  check: '#23a55a',
  done: '#23a55a',
  question: '#e6a23c',
  help: '#e6a23c',
  faq: '#e6a23c',
  warning: '#e6a23c',
  caution: '#e6a23c',
  attention: '#e6a23c',
  danger: '#e5484d',
  error: '#e5484d',
  failure: '#e5484d',
  fail: '#e5484d',
  missing: '#e5484d',
  bug: '#a855f7',
  example: '#9b59b6',
  quote: '#7f8c9b',
  cite: '#7f8c9b',
};

const CALLOUT_CSS = Object
  .entries(CALLOUT_COLORS)
  .map(([ type, color ]) => `.callout[data-callout="${type}"]{border-left-color:${color}}.callout[data-callout="${type}"] .callout-title{color:${color}}`)
  .join('');

const EMBEDDED_CSS = `
.callout{border:1px solid #d0d7de;border-left-width:4px;border-radius:6px;padding:.5em 1em;margin:1.2em 0;background:#f6f8fa}
.callout>:first-child{margin-top:.3em}
.callout>:last-child{margin-bottom:.3em}
.callout-title{font-weight:600;margin:.2em 0 .5em}
details.callout summary{cursor:pointer}
.callout-content{margin:0}
${CALLOUT_CSS}
li.task-list-item{list-style-type:none}
li.task-list-item>input.task-list-item-checkbox{margin-right:.5em;vertical-align:middle}
mark{background:#fff3a3;color:inherit;padding:.05em .2em;border-radius:3px}
.footnotes{font-size:.9em;color:#555;border-top:1px solid #d0d7de;margin-top:2em;padding-top:.5em}
.footnotes ol{padding-left:1.2em}
pre{background:#f6f8fa;border-radius:6px;padding:.9em 1em;overflow-x:auto;line-height:1.5}
pre code{font-family:Consolas,Menlo,"Courier New",monospace;font-size:.92em;background:transparent;padding:0;color:#1f2328}
.hljs-comment,.hljs-quote{color:#6e7781;font-style:italic}
.hljs-keyword,.hljs-selector-tag,.hljs-deletion,.hljs-doctag{color:#cf222e}
.hljs-string,.hljs-regexp,.hljs-addition,.hljs-meta .hljs-string{color:#0a3069}
.hljs-number,.hljs-literal,.hljs-variable,.hljs-template-variable,.hljs-type,.hljs-selector-attr,.hljs-selector-pseudo{color:#0550ae}
.hljs-title,.hljs-section,.hljs-title.function_{color:#8250df}
.hljs-attr,.hljs-attribute,.hljs-title.class_,.hljs-symbol,.hljs-name{color:#953800}
.hljs-built_in,.hljs-class .hljs-title{color:#e16f24}
.hljs-meta,.hljs-selector-id,.hljs-selector-class{color:#0550ae}
.hljs-emphasis{font-style:italic}
.hljs-strong{font-weight:600}
.hljs-addition{background:#e6ffec}
.hljs-deletion{background:#ffebe9}
`.trim();

const STYLE_MARKERS = [
  'hljs-',
  'callout',
  'task-list-item-checkbox',
  '<mark>',
  'footnote',
];

/**
 * Prepends the embedded stylesheet when the post content uses any
 * feature which relies on it. Returns the content unchanged otherwise.
 */
export function ensureEmbeddedStyles(html: string): string {
  if (!STYLE_MARKERS.some(marker => html.includes(marker))) {
    return html;
  }
  return `<style>${EMBEDDED_CSS}</style>\n${html}`;
}
