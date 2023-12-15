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
}
