import MarkdownIt from 'markdown-it';
import { CommentConvertMode } from './plugin-settings';

const tokenType = 'ob_comment';

interface MarkdownItCommentPluginOptions {
  convertMode: CommentConvertMode;
}

const pluginOptions: MarkdownItCommentPluginOptions = {
  convertMode: CommentConvertMode.Ignore,
}

export const MarkdownItCommentPluginInstance = {
  plugin: plugin,
  updateConvertMode: (mode: CommentConvertMode) => {
    pluginOptions.convertMode = mode;
  },
}

function plugin(md: MarkdownIt): void {
  md.inline.ruler.before('emphasis', tokenType, (state, silent) => {
    const start = state.pos;
    const max = state.posMax;
    const src = state.src;

    // check if start with %%
    if (src.charCodeAt(start) !== 0x25 /* % */ || start + 4 >= max) {
      return false;
    }
    if (src.charCodeAt(start + 1) !== 0x25 /* % */) {
      return false;
    }

    // find ended %%
    let end = start + 2;
    while (end < max && (src.charCodeAt(end) !== 0x25 /* % */ || src.charCodeAt(end + 1) !== 0x25 /* % */)) {
      end++;
    }

    if (end >= max) {
      return false;
    }

    end += 2; // skip ended %%

    if (!silent) {
      const token = state.push(tokenType, 'comment', 0);
      token.content = src.slice(start + 2, end - 2).trim();
      state.pos = end;
      return true;
    }

    state.pos = end;
    return true;
  });

  md.renderer.rules[tokenType] = (tokens, idx) => {
    if (pluginOptions.convertMode === CommentConvertMode.HTML) {
      return `<!-- ${tokens[idx].content} -->`;
    } else {
      return '';
    }
  };

  // multi-line comment block:
  //
  //     %%
  //     commented content
  //     %%
  //
  // The inline rule takes care of single-line comments, so the block rule
  // only engages when the first line has no closing `%%`.
  md.block.ruler.before('paragraph', `${tokenType}_block`, (state, startLine, endLine, silent) => {
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const maxPos = state.eMarks[startLine];
    const firstLine = state.src.slice(startPos, maxPos).trim();
    if (!firstLine.startsWith('%%')) {
      return false;
    }
    // there is a closing `%%` in the first line, let the inline rule handle it
    if (firstLine.slice(2).includes('%%')) {
      return false;
    }
    if (silent) {
      return true;
    }

    const content: string[] = [];
    let nextLine = startLine + 1;
    while (nextLine < endLine) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd);
      const trimmed = line.trim();
      if (trimmed.endsWith('%%')) {
        const stripped = trimmed.replace(/%%\s*$/, '');
        if (stripped.trim().length > 0) {
          content.push(stripped);
        }
        nextLine++;
        break;
      }
      content.push(line);
      nextLine++;
    }

    const token = state.push(tokenType, 'comment', 0);
    token.content = content.join('\n').trim();
    token.map = [ startLine, nextLine ];
    state.line = nextLine;
    return true;
  });
}
