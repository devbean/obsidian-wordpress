import MarkdownIt from 'markdown-it';

const tokenType = 'ob_mark';

/**
 * Converts Obsidian highlights `==text==` into `<mark>text</mark>`.
 */
export const MarkdownItHighlightPluginInstance = {
  plugin: plugin,
}

function plugin(md: MarkdownIt): void {
  md.inline.ruler.after('link', tokenType, (state, silent) => {
    const startPos = state.pos;
    const maxPos = state.posMax;

    if (state.src.charCodeAt(startPos) !== 0x3D /* = */ || state.src.charCodeAt(startPos + 1) !== 0x3D) {
      return false;
    }
    if (silent) {
      return false;
    }

    // find the closing `==`
    state.pos = startPos + 2;
    while (state.pos < state.posMax) {
      if (state.src.charCodeAt(state.pos) === 0x3D /* = */
        && state.src.charCodeAt(state.pos - 1) !== 0x5C /* backslash */
        && state.src.charCodeAt(state.pos + 1) === 0x3D) {
        break;
      }
      state.pos++;
    }
    // not found, or empty highlight
    if (state.pos + 1 >= state.posMax || startPos + 2 === state.pos) {
      state.pos = startPos;
      return false;
    }

    state.posMax = state.pos;
    state.pos = startPos + 2;
    state.push(`${tokenType}_open`, 'mark', 1);
    state.md.inline.tokenize(state);
    state.push(`${tokenType}_close`, 'mark', -1);

    state.pos = state.posMax + 2;
    state.posMax = maxPos;
    return true;
  });
}
