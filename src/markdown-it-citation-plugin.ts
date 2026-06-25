import MarkdownIt from 'markdown-it';
import { trim } from 'lodash-es';

const tokenType = 'ob_pandoc_citation';

interface MarkdownItCitationPluginOptions {
  enabled: boolean;
}

const pluginOptions: MarkdownItCitationPluginOptions = {
  enabled: false,
};

interface CitationEntry {
  key: string;
  locator?: string;
}

function parseCitationEntry(value: string): CitationEntry | null {
  const entry = trim(value);
  if (entry.length === 0 || !entry.startsWith('@')) {
    return null;
  }

  const withoutPrefix = trim(entry.slice(1));
  if (withoutPrefix.length === 0) {
    return null;
  }

  const separatorIndex = withoutPrefix.indexOf(',');
  if (separatorIndex < 0) {
    return {
      key: withoutPrefix,
    };
  }

  const key = trim(withoutPrefix.slice(0, separatorIndex));
  const locator = trim(withoutPrefix.slice(separatorIndex + 1));
  if (key.length === 0) {
    return null;
  }

  if (locator.length === 0) {
    return {
      key,
    };
  }

  return {
    key,
    locator,
  };
}

function toZotpressInTextShortcode(entries: CitationEntry[]): string {
  const itemValue = entries
    .map((entry) => {
      if (entry.locator) {
        return `{${entry.key},${entry.locator}}`;
      }
      return `{${entry.key}}`;
    })
    .join(';');

  return `[zotpressInText item="${itemValue}"]`;
}

export const MarkdownItCitationPluginInstance = {
  plugin,
  updateEnabled: (enabled: boolean) => {
    pluginOptions.enabled = enabled;
  },
};

function plugin(md: MarkdownIt): void {
  md.inline.ruler.after('backticks', tokenType, (state, silent) => {
    if (!pluginOptions.enabled) {
      return false;
    }
    const regex = /^\[\[\s*(@[^\]\n]+?)\s*\]\]/;
    const match = state.src.slice(state.pos).match(regex);
    if (!match) {
      return false;
    }

    const rawBody = match[1];
    const entries = rawBody
      .split(';')
      .map(parseCitationEntry);

    if (entries.length === 0 || entries.some((entry) => entry === null)) {
      return false;
    }

    if (silent) {
      return true;
    }

    const token = state.push(tokenType, 'span', 0);
    token.content = toZotpressInTextShortcode(entries as CitationEntry[]);
    state.pos += match[0].length;
    return true;
  });

  md.renderer.rules[tokenType] = (tokens, idx) => {
    return tokens[idx].content;
  };
}
