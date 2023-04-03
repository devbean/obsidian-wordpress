import { liteAdaptor, LiteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { MathDocument } from 'mathjax-full/js/core/MathDocument';
import { MathJaxOutputType, WordpressPluginSettings } from './settings';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { mathjax } from 'mathjax-full/js/mathjax';
import { TeX } from 'mathjax-full/js/input/tex';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';
import { SVG } from 'mathjax-full/js/output/svg';
import { marked } from 'marked';
import { Setting } from 'obsidian';
import { WpProfile } from './wp-profile';

export type SafeAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function openWithBrowser(url: string, queryParams: Record<string, undefined|number|string> = {}): void {
  window.open(`${url}?${generateQueryString(queryParams)}`);
}

export function generateQueryString(params: Record<string, undefined|number|string>): string {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter( ([k, v]) => v!==undefined)
    ) as Record<string, string>
  ).toString();
}

export function isPromiseFulfilledResult<T>(obj: SafeAny): obj is PromiseFulfilledResult<T> {
  return !!obj && obj.status === 'fulfilled' && obj.value;
}

export function buildMarked(settings: WordpressPluginSettings): void {
  let adaptor: LiteAdaptor | null = null;
  let mathDocument: MathDocument<SafeAny, SafeAny, SafeAny> | null = null;
  if (settings.mathJaxOutputType === MathJaxOutputType.SVG) {
    adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    mathDocument = mathjax.document('', {
      InputJax: new TeX({ packages: AllPackages }),
      OutputJax: new SVG({ fontCache: 'local' })
    });
  }

  marked.use({
    extensions: [
      {
        name: 'mp_keep_inline',
        level: 'inline',
        start: (src) => src.indexOf('$'),
        tokenizer: (src, tokens) => {
          const match = src.match(/^\$([^$\n]+?)\$/);
          if (match) {
            return {
              type: 'mp_keep_inline',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer: (token) => {
          if (settings.mathJaxOutputType === MathJaxOutputType.SVG) {
            if (mathDocument && adaptor) {
              const node = mathDocument.convert(token.text);
              return adaptor.innerHTML(node);
            }
          }
          return `$${token.text}$`;
        }
      },
      {
        name: 'mp_keep_block',
        level: 'block',
        start: (src) => src.indexOf('\n$$'),
        tokenizer: (src, tokens) => {
          const match = src.match(/^\$\$([\s\S]+?)\$\$/);
          if (match) {
            return {
              type: 'mp_keep_block',
              raw: match[0],
              text: match[1].trim()
            };
          }
        },
        renderer: (token) => {
          if (settings.mathJaxOutputType === MathJaxOutputType.SVG) {
            if (mathDocument && adaptor) {
              const node = mathDocument.convert(token.text);
              return adaptor.innerHTML(node);
            }
          }
          return `$$${token.text}$$\n`;
        }
      }
    ]
  });
}

export function rendererProfile(profile: WpProfile, container: HTMLElement): Setting {
  let name = profile.name;
  if (profile.isDefault) {
    name += ' ✔️';
  }
  let desc = profile.endpoint;
  if (profile.wpComOAuth2Token) {
    desc += ` / 🆔 / 🔒`;
  } else {
    if (profile.saveUsername) {
      desc += ` / 🆔 ${profile.username}`;
    }
    if (profile.savePassword) {
      desc += ' / 🔒 ******';
    }
  }
  return new Setting(container)
    .setName(name)
    .setDesc(desc);
}

export function isValidUrl(url: string): boolean {
  try {
    return Boolean(new URL(url));
  } catch(e) {
    return false;
  }
}
