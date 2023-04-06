import MarkdownIt from 'markdown-it';
import StateInline from 'markdown-it/lib/rules_inline/state_inline';
import StateBlock from 'markdown-it/lib/rules_block/state_block';
import { TeX } from 'mathjax-full/js/input/tex';
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages';
import { SVG } from 'mathjax-full/js/output/svg';
import Token from 'markdown-it/lib/token';
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import { AssistiveMmlHandler } from 'mathjax-full/js/a11y/assistive-mml';
import { mathjax } from 'mathjax-full/js/mathjax';
import juice from 'juice';
import { SafeAny } from './utils';
import { MathJaxOutputType } from './plugin-settings';


interface MarkdownItMathJax3PluginOptions {
  outputType: MathJaxOutputType;
}

interface ConvertOptions {
  display: boolean
}

export default function MarkdownItMathJax3Plugin(md: MarkdownIt, options: MarkdownItMathJax3PluginOptions): void {
  // set MathJax as the renderer for markdown-it-simplemath
  md.inline.ruler.after('escape', 'math_inline', mathInline);
  md.block.ruler.after('blockquote', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  });
  md.renderer.rules.math_inline = (tokens: Token[], idx: number) => {
    return renderMath(tokens[idx].content, {
      display: false
    }, options);
  };
  md.renderer.rules.math_block = (tokens: Token[], idx: number) => {
    return renderMath(tokens[idx].content, {
      display: true
    }, options);
  };
}

function renderMath(content: string, convertOptions: ConvertOptions, options: MarkdownItMathJax3PluginOptions): string {
  if (options.outputType === MathJaxOutputType.SVG) {
    const documentOptions = {
      InputJax: new TeX({ packages: AllPackages }),
      OutputJax: new SVG({ fontCache: 'none' })
    };
    const adaptor = liteAdaptor();
    const handler = RegisterHTMLHandler(adaptor);
    AssistiveMmlHandler(handler);
    const mathDocument = mathjax.document(content, documentOptions);
    const html = adaptor.outerHTML(mathDocument.convert(content, convertOptions));
    const stylesheet = adaptor.outerHTML(documentOptions.OutputJax.styleSheet(mathDocument) as SafeAny);
    return juice(html + stylesheet);
  } else {
    if (convertOptions.display) {
      return `$$\n${content}$$\n`;
    } else {
      return `$${content}$`;
    }
  }
}

// Test if potential opening or closing delimiter
// Assumes that there is a '$' at state.src[pos]
function isValidDelimiter(state: StateInline, pos: number) {
  const max = state.posMax;
  let canOpen = true;
  let canClose = true;

  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

  // Check non-whitespace conditions for opening and closing, and
  // check that closing delimiter isn't followed by a number
  if (prevChar === 0x20 /* ' ' */
    || prevChar === 0x09 /* \t */
    || (nextChar >= 0x30 /* '0' */ && nextChar <= 0x39) /* '9' */
  ) {
    canClose = false;
  }
  if (nextChar === 0x20 /* ' ' */ || nextChar === 0x09 /* \t */) {
    canOpen = false;
  }

  return {
    canOpen,
    canClose
  };
}

function mathInline(state: StateInline, silent: boolean) {
  if (state.src[state.pos] !== '$') {
    return false;
  }

  let res = isValidDelimiter(state, state.pos);
  if (!res.canOpen) {
    if (!silent) {
      state.pending += '$';
    }
    state.pos += 1;
    return true;
  }

  // First check for and bypass all properly escaped delimiters
  // This loop will assume that the first leading backtick can not
  // be the first character in state.src, which is known since
  // we have found an opening delimiter already.
  const start = state.pos + 1;
  let match = start;
  while ((match = state.src.indexOf('$', match)) !== -1) {
    // Found potential $, look for escapes, pos will point to
    // first non escape when complete
    let pos = match - 1;
    while (state.src[pos] === '\\') {
      pos -= 1;
    }

    // Even number of escapes, potential closing delimiter found
    if ((match - pos) % 2 == 1) {
      break;
    }
    match += 1;
  }

  // No closing delimter found.  Consume $ and continue.
  if (match === -1) {
    if (!silent) {
      state.pending += '$';
    }
    state.pos = start;
    return true;
  }

  // Check if we have empty content, ie: $$.  Do not parse.
  if (match - start === 0) {
    if (!silent) {
      state.pending += '$$';
    }
    state.pos = start + 1;
    return true;
  }

  // Check for valid closing delimiter
  res = isValidDelimiter(state, match);
  if (!res.canClose) {
    if (!silent) {
      state.pending += '$';
    }
    state.pos = start;
    return true;
  }

  if (!silent) {
    const token = state.push('math_inline', 'math', 0);
    token.markup = '$';
    token.content = state.src.slice(start, match);
  }

  state.pos = match + 1;
  return true;
}

function mathBlock(state: StateBlock, start: number, end: number, silent: boolean) {
  let next: number;
  let lastPos: number;
  let found = false;
  let pos = state.bMarks[start] + state.tShift[start];
  let max = state.eMarks[start];
  let lastLine = '';

  if (pos + 2 > max) {
    return false;
  }
  if (state.src.slice(pos, pos + 2) !== '$$') {
    return false;
  }

  pos += 2;
  let firstLine = state.src.slice(pos, max);

  if (silent) {
    return true;
  }
  if (firstLine.trim().slice(-2) === '$$') {
    // Single line expression
    firstLine = firstLine.trim().slice(0, -2);
    found = true;
  }

  for (next = start; !found; ) {
    next++;

    if (next >= end) {
      break;
    }

    pos = state.bMarks[next] + state.tShift[next];
    max = state.eMarks[next];

    if (pos < max && state.tShift[next] < state.blkIndent) {
      // non-empty line with negative indent should stop the list:
      break;
    }

    if (state.src.slice(pos, max).trim().slice(-2) === '$$') {
      lastPos = state.src.slice(0, max).lastIndexOf('$$');
      lastLine = state.src.slice(pos, lastPos);
      found = true;
    }
  }

  state.line = next + 1;

  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content =
    (firstLine && firstLine.trim() ? firstLine + '\n' : '') +
    state.getLines(start + 1, next, state.tShift[start], true) +
    (lastLine && lastLine.trim() ? lastLine : '');
  token.map = [start, state.line];
  token.markup = '$$';
  return true;
}
