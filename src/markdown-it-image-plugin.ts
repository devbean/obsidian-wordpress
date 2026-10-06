import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token.mjs';
import { trim } from 'lodash-es';


const tokenType = 'ob_img';

export interface MarkdownItImageActionParams {
  src: string;
  width?: string;
  height?: string;
}

interface MarkdownItImagePluginOptions {
  doWithImage: (img: MarkdownItImageActionParams) => void;
}

const pluginOptions: MarkdownItImagePluginOptions = {
  doWithImage: () => {},
}

export const MarkdownItImagePluginInstance = {
  plugin: plugin,
  doWithImage: (action: (img: MarkdownItImageActionParams) => void) => {
    pluginOptions.doWithImage = action;
  },
}

function plugin(md: MarkdownIt): void {
  md.inline.ruler.after('image', tokenType, (state, silent) => {
    const regex = /^!\[\[([^|\]\n]+)(\|([^\]\n]+))?\]\]/;
    const match = state.src.slice(state.pos).match(regex);
    if (match) {
      if (silent) {
        return true;
      }
      const token = state.push(tokenType, 'img', 0);
      const matched = match[0];
      const src = match[1];
      const suffix = match[3];
      let alt: string | undefined;
      let width: string | undefined;
      let height: string | undefined;
      if (suffix) {
        if (/^\d+(x\d+)?$/.test(suffix.trim())) {
          const sepIndex = suffix.indexOf('x'); // width x height
          if (sepIndex > 0) {
            width = trim(suffix.substring(0, sepIndex));
            height = trim(suffix.substring(sepIndex + 1));
          } else {
            width = trim(suffix);
          }
        } else {
          // the suffix is an alt text: ![[image.png|some alt]]
          alt = suffix.trim();
        }
      }
      token.attrs = [
        [ 'src', src ],
      ];
      if (alt) {
        token.attrs.push([ 'alt', alt ]);
      }
      if (width) {
        token.attrs.push([ 'width', width ]);
      }
      if (height) {
        token.attrs.push([ 'height', height ]);
      }
      if (pluginOptions.doWithImage) {
        pluginOptions.doWithImage({
          src,
          width,
          height,
        });
      }
      state.pos += matched.length;
      return true;
    } else {
      return false;
    }
  });
  md.renderer.rules.ob_img = (tokens: Token[], idx: number) => {
    const token = tokens[idx];
    const attrs = token.attrs ?? [];
    const src = attrs.find(([ name ]) => name === 'src')?.[1];
    const alt = attrs.find(([ name ]) => name === 'alt')?.[1];
    const width = attrs.find(([ name ]) => name === 'width')?.[1];
    const height = attrs.find(([ name ]) => name === 'height')?.[1];
    if (!src || !md.validateLink(src)) {
      return '';
    }
    let html = `<img src="${md.utils.escapeHtml(src)}"`;
    if (alt) {
      html += ` alt="${md.utils.escapeHtml(alt)}"`;
    }
    if (width) {
      html += ` width="${md.utils.escapeHtml(width)}"`;
    }
    if (height) {
      html += ` height="${md.utils.escapeHtml(height)}"`;
    }
    return `${html}>`;
  };
}
