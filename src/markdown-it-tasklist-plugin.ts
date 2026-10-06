import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';

const TASK_RE = /^\[([ xX])\] +/;

/**
 * Converts Obsidian task list items into HTML checkboxes.
 *
 *     - [ ] buy milk
 *     - [x] done
 *
 * becomes
 *
 *     <li class="task-list-item">
 *       <input type="checkbox" class="task-list-item-checkbox" disabled> buy milk
 *     </li>
 */
export const MarkdownItTaskListPluginInstance = {
  plugin: plugin,
}

function plugin(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'ob_tasklist', state => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'inline') {
        continue;
      }
      const children = tokens[i].children;
      const first = children?.[0];
      if (!children || !first || first.type !== 'text') {
        continue;
      }
      const match = first.content.match(TASK_RE);
      if (!match) {
        continue;
      }
      // the structure is: list_item_open, paragraph_open, inline, ...
      const listItem = tokens[i - 2];
      if (!listItem || listItem.type !== 'list_item_open') {
        continue;
      }
      listItem.attrJoin('class', 'task-list-item');

      const checkbox = new Token('html_inline', '', 0);
      checkbox.content = `<input type="checkbox" class="task-list-item-checkbox" disabled${match[1] === ' ' ? '' : ' checked'}> `;
      children.unshift(checkbox);
      first.content = first.content.substring(match[0].length);
    }
  });
}
