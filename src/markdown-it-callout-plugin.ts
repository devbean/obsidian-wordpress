import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';

/**
 * The icon of the callout title, mapped from the Obsidian callout type.
 * From https://help.obsidian.md/Editing+and+formatting/Callouts
 */
const CALLOUT_ICONS: Record<string, string> = {
  'note': '✏️',
  'abstract': '📋',
  'summary': '📋',
  'tldr': '📋',
  'info': 'ℹ️',
  'todo': '☑️',
  'tip': '🔥',
  'hint': '🔥',
  'important': '🔥',
  'success': '✅',
  'check': '✅',
  'done': '✅',
  'question': '❓',
  'help': '❓',
  'faq': '❓',
  'warning': '⚠️',
  'caution': '⚠️',
  'attention': '⚠️',
  'failure': '❌',
  'fail': '❌',
  'missing': '❌',
  'danger': '⚡',
  'error': '⚡',
  'bug': '🐞',
  'example': '📑',
  'quote': '💬',
  'cite': '💬',
};

const CALLOUT_RE = /^\[!([\w-]+)\]([+-]?)\s*/;

/**
 * Converts Obsidian callouts into HTML.
 *
 * A callout without a fold marker:
 *
 *     > [!note] Title
 *     > Content
 *
 * becomes
 *
 *     <div class="callout callout-note" data-callout="note">
 *       <p class="callout-title">✏️ Title</p>
 *       <p>Content</p>
 *     </div>
 *
 * A callout with a fold marker (`-` or `+`) becomes a collapsible
 * `<details>`/`<summary>` element (`+` means expanded by default).
 */
export const MarkdownItCalloutPluginInstance = {
  plugin: plugin,
}

function plugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'ob_callout', state => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') {
        continue;
      }
      let closeIndex = findMatchingClose(tokens, i);
      if (closeIndex < 0) {
        continue;
      }
      // the structure is: blockquote_open, paragraph_open, inline, paragraph_close, ...
      if (tokens[i + 1]?.type !== 'paragraph_open' || tokens[i + 2]?.type !== 'inline') {
        continue;
      }
      const inline = tokens[i + 2];
      const firstChild = inline.children?.[0];
      if (!firstChild || firstChild.type !== 'text') {
        continue;
      }
      const match = firstChild.content.match(CALLOUT_RE);
      if (!match) {
        continue;
      }

      const type = match[1];
      const fold = match[2];
      const collapsible = fold === '-' || fold === '+';
      const title = firstChild.content.substring(match[0].length).trim();

      const openToken = tokens[i];
      const closeToken = tokens[closeIndex];

      openToken.tag = collapsible ? 'details' : 'div';
      closeToken.tag = collapsible ? 'details' : 'div';
      if (fold === '+') {
        openToken.attrSet('open', '');
      }
      openToken.attrSet('class', `callout callout-${type}`);
      openToken.attrSet('data-callout', type);

      const titleOpen = new Token('paragraph_open', collapsible ? 'summary' : 'p', 1);
      titleOpen.attrSet('class', 'callout-title');
      const titleInline = new Token('inline', '', 0);
      const titleText = new Token('text', '', 0);
      titleText.content = `${CALLOUT_ICONS[type] ?? '✏️'} ${title || type}`;
      titleInline.children = [ titleText ];
      const titleClose = new Token('paragraph_close', titleOpen.tag, -1);
      const titleTokens = [ titleOpen, titleInline, titleClose ];

      // the whole first line is consumed by the marker and the title
      firstChild.content = '';
      if (inline.children!.length === 1) {
        // no content left, remove the first paragraph entirely
        // (paragraph_open, inline, paragraph_close)
        tokens.splice(i + 1, 3);
        closeIndex -= 3;
      } else if (inline.children![1]?.type === 'softbreak') {
        inline.children!.splice(0, 2);
      } else {
        inline.children!.shift();
      }

      if (collapsible) {
        // wrap all the content into a <div class="callout-content">
        const contentOpen = new Token('paragraph_open', 'div', 1);
        contentOpen.attrSet('class', 'callout-content');
        const contentClose = new Token('paragraph_close', 'div', -1);
        // insert at the end first to keep the previous indices valid
        tokens.splice(closeIndex, 0, contentClose);
        tokens.splice(i + 1, 0, ...titleTokens, contentOpen);
      } else {
        tokens.splice(i + 1, 0, ...titleTokens);
      }
    }
  });
}

function findMatchingClose(tokens: Token[], openIndex: number): number {
  let depth = 0;
  for (let j = openIndex; j < tokens.length; j++) {
    if (tokens[j].type === 'blockquote_open') {
      depth++;
    } else if (tokens[j].type === 'blockquote_close') {
      depth--;
      if (depth === 0) {
        return j;
      }
    }
  }
  return -1;
}
