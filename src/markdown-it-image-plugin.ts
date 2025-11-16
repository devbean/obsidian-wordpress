import MarkdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import { trim } from 'lodash-es';
import { Logger } from './logger';

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
      const matched = match[0];
      const src = match[1];
      const size = match[3];
      if (silent) {
        Logger.log(`MarkdownItImagePlugin: silent match src ${src}, size ${size}`);
        return true;
      }
      const token = state.push(tokenType, 'img', 0);
      
      Logger.log('image src', src);
      Logger.log('image size', size);
      let width: string | undefined;
      let height: string | undefined;
      if (size) {
        const sepIndex = size.indexOf('x'); // width x height
        if (sepIndex > 0) {
          width = trim(size.substring(0, sepIndex));
          height = trim(size.substring(sepIndex + 1));
          token.attrs = [
            [ 'src', src ],
            [ 'width', width ],
            [ 'height', height ],
          ];
        } else {
          width = trim(size);
          token.attrs = [
            [ 'src', src ],
            [ 'width', width ],
          ];
        }
      } else {
        token.attrs = [
          [ 'src', src ],
        ];
      }
      if (pluginOptions.doWithImage) {
        pluginOptions.doWithImage({
          src: token.attrs?.[0]?.[1],
          width: token.attrs?.[1]?.[1],
          height: token.attrs?.[2]?.[1],
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
    const src = token.attrs?.[0]?.[1];
    const width = token.attrs?.[1]?.[1];
    const height = token.attrs?.[2]?.[1];
    Logger.log(`MarkdownItImagePlugin: render image src ${src}, width ${width}, height ${height}`);
    if (width) {
      if (height) {
        return `<img src="${src}" width="${width}" height="${height}" alt="">`;
      }
      return `<img src="${src}" width="${width}" alt="">`;
    } else {
      return `<img src="${src}" alt="">`;
    }
  };
}
