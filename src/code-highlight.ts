import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import yaml from 'highlight.js/lib/languages/yaml';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import php from 'highlight.js/lib/languages/php';
import ruby from 'highlight.js/lib/languages/ruby';
import kotlin from 'highlight.js/lib/languages/kotlin';
import diff from 'highlight.js/lib/languages/diff';
import ini from 'highlight.js/lib/languages/ini';
import powershell from 'highlight.js/lib/languages/powershell';
import dockerfile from 'highlight.js/lib/languages/dockerfile';

let registered = false;

function registerLanguages(): void {
  if (registered) {
    return;
  }
  registered = true;
  hljs.registerLanguage('javascript', javascript);
  hljs.registerLanguage('typescript', typescript);
  hljs.registerLanguage('python', python);
  hljs.registerLanguage('bash', bash);
  hljs.registerLanguage('json', json);
  hljs.registerLanguage('yaml', yaml);
  hljs.registerLanguage('css', css);
  hljs.registerLanguage('xml', xml);
  hljs.registerLanguage('markdown', markdown);
  hljs.registerLanguage('sql', sql);
  hljs.registerLanguage('java', java);
  hljs.registerLanguage('c', c);
  hljs.registerLanguage('cpp', cpp);
  hljs.registerLanguage('csharp', csharp);
  hljs.registerLanguage('go', go);
  hljs.registerLanguage('rust', rust);
  hljs.registerLanguage('php', php);
  hljs.registerLanguage('ruby', ruby);
  hljs.registerLanguage('kotlin', kotlin);
  hljs.registerLanguage('diff', diff);
  hljs.registerLanguage('ini', ini);
  hljs.registerLanguage('powershell', powershell);
  hljs.registerLanguage('dockerfile', dockerfile);
}

/**
 * Adds publish-time syntax highlighting for code fences.
 *
 * The highlighted HTML (hljs classes with a self-contained stylesheet,
 * see `embedded-styles.ts`) is part of the post content, so WordPress
 * needs no client-side highlighting plugin.
 */
export const CodeHighlightPluginInstance = {
  plugin: plugin,
}

function plugin(md: MarkdownIt): void {
  registerLanguages();
  md.set({
    highlight: (str: string, lang: string): string => {
      const language = (lang ?? '').trim().split(/\s+/)[0].toLowerCase();
      if (language.length > 0 && hljs.getLanguage(language)) {
        try {
          return hljs.highlight(str, { language, ignoreIllegals: true }).value;
        } catch {
          // fall through to plain escaping
        }
      }
      return '';
    },
  });
}
