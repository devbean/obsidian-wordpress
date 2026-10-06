import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';
import { subpathAnchor } from './markdown-it-anchor-plugin';

const tokenType = 'ob_wikilink';

/**
 * Resolution result of a wikilink target.
 */
export interface WikiLinkResolution {
  /**
   * Whether the target file exists in the vault.
   */
  exists: boolean;

  /**
   * Permalink of the published post which the target note
   * has been published to. `undefined` if not published.
   */
  permalink?: string;

  /**
   * Subpath of the wikilink, e.g. `#heading` or `#^block-id`
   * without the leading `#`.
   */
  subpath?: string;
}

interface MarkdownItWikiLinkPluginOptions {
  resolve: (linkpath: string) => WikiLinkResolution | undefined;
  onUnresolved: (target: string) => void;
  unresolved: string[];
}

const pluginOptions: MarkdownItWikiLinkPluginOptions = {
  resolve: () => undefined,
  onUnresolved: () => {},
  unresolved: [],
}

export const MarkdownItWikiLinkPluginInstance = {
  plugin: plugin,
  setResolver: (resolve: (linkpath: string) => WikiLinkResolution | undefined) => {
    pluginOptions.resolve = resolve;
  },
  resetUnresolved: () => {
    pluginOptions.unresolved = [];
  },
  onUnresolved: (cb: (target: string) => void) => {
    pluginOptions.onUnresolved = cb;
  },
  takeUnresolved: (): string[] => {
    const result = pluginOptions.unresolved;
    pluginOptions.unresolved = [];
    return result;
  },
}

/**
 * Splits a wikilink target into path and subpath.
 * `note#heading` -> [ 'note', 'heading' ], `note` -> [ 'note', undefined ]
 */
export function splitWikiLinkTarget(target: string): [ string, string | undefined ] {
  const hashIndex = target.indexOf('#');
  if (hashIndex < 0) {
    return [ target, undefined ];
  }
  return [ target.substring(0, hashIndex), target.substring(hashIndex + 1) ];
}

function encodeSubpath(subpath: string): string {
  return subpath
    ? encodeURIComponent(subpathAnchor(subpath)) : '';
}

function plugin(md: MarkdownIt): void {
  md.inline.ruler.after('image', tokenType, (state, silent) => {
    // do not conflict with embeds `![[...]]`
    if (state.pos > 0 && state.src[state.pos - 1] === '!') {
      return false;
    }
    if (state.src[state.pos] !== '[' || state.src[state.pos + 1] !== '[') {
      return false;
    }
    const end = state.src.indexOf(']]', state.pos + 2);
    if (end < 0) {
      return false;
    }
    const content = state.src.slice(state.pos + 2, end);
    // no newlines allowed inside wikilinks
    if (content.includes('\n') || content.includes('[') || content.includes(']')) {
      return false;
    }
    if (silent) {
      return true;
    }

    const sepIndex = content.indexOf('|');
    const target = (sepIndex >= 0 ? content.substring(0, sepIndex) : content).trim();
    const alias = sepIndex >= 0 ? content.substring(sepIndex + 1).trim() : undefined;
    const [ linkpath, subpath ] = splitWikiLinkTarget(target);

    const token = state.push(tokenType, 'a', 0);
    token.content = target;
    token.meta = { alias, subpath };
    state.pos = end + 2;
    return true;
  });

  md.renderer.rules[tokenType] = (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    const target: string = token.content;
    const { alias }: { alias?: string, subpath?: string } = token.meta ?? {};

    // `[[note#heading]]` is displayed as "note > heading" in Obsidian
    const [ path ] = splitWikiLinkTarget(target);
    const subpath = token.meta.subpath as string | undefined;
    const display = alias ?? (subpath ? `${path} > ${subpath}` : path);

    const resolution = pluginOptions.resolve(target);
    if (resolution?.exists && resolution.permalink) {
      const anchorSubpath = resolution.subpath !== undefined && resolution.subpath !== ''
        ? resolution.subpath
        : subpath;
      const href = anchorSubpath
        ? `${resolution.permalink}#${encodeSubpath(anchorSubpath)}`
        : resolution.permalink;
      if (md.validateLink(href)) {
        return `<a href="${md.utils.escapeHtml(href)}">${md.utils.escapeHtml(display)}</a>`;
      }
    }

    // unresolved or unpublished: render as plain text
    pluginOptions.unresolved.push(target);
    pluginOptions.onUnresolved(target);
    return md.utils.escapeHtml(display);
  };
}
