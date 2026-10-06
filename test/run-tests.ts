import MarkdownIt from 'markdown-it';
import { MarkdownItMathJax3PluginInstance } from '../src/markdown-it-mathjax3-plugin';
import footnote from 'markdown-it-footnote';
import { TFile, TFolder, Modal, setRequestUrlHandler } from './obsidian-stub';
import { buildBatchPublishPlan, collectBatchFiles } from '../src/batch-publish';
import { openLoginModal, WpLoginModal } from '../src/wp-login-modal';
import { PostStatus } from '../src/wp-api';
import WordpressPlugin from '../src/main';
import { markdownItAnchorPlugin } from '../src/markdown-it-anchor-plugin';
import { AbstractWordPressClient } from '../src/abstract-wp-client';
import { WordPressClientReturnCode, WordPressPostParams } from '../src/wp-client';
import { DEFAULT_SETTINGS, ApiType, MathJaxOutputType, settingsForPersistence } from '../src/plugin-settings';
import { ConfirmCode } from '../src/confirm-modal';
import { WpProfile } from '../src/wp-profile';
import { WpPublishModal } from '../src/wp-publish-modal';
import { SafeAny } from '../src/utils';
import { MarkdownItWikiLinkPluginInstance, splitWikiLinkTarget, WikiLinkResolution } from '../src/markdown-it-wikilink-plugin';
import { MarkdownItImagePluginInstance } from '../src/markdown-it-image-plugin';
import { MarkdownItCommentPluginInstance } from '../src/markdown-it-comment-plugin';
import { MarkdownItCalloutPluginInstance } from '../src/markdown-it-callout-plugin';
import { MarkdownItTaskListPluginInstance } from '../src/markdown-it-tasklist-plugin';
import { MarkdownItHighlightPluginInstance } from '../src/markdown-it-highlight-plugin';
import { MarkdownItMermaidPluginInstance, wrapMermaidSvg } from '../src/markdown-it-mermaid-plugin';
import { CodeHighlightPluginInstance } from '../src/code-highlight';
import { ensureEmbeddedStyles } from '../src/embedded-styles';
import { renderMermaidDiagrams } from '../src/mermaid-renderer';
import {
  collectWikiLinkTargets,
  createWikiLinkResolver,
  expandNoteEmbeds,
  extractSection,
  getMediaRefs,
  getFileReferences,
  mimeTypeFor,
  replaceContentRanges
} from '../src/publish-converters';
import { stripFrontmatter } from '../src/utils';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ok - ${name}`);
    })
    .catch(error => {
      failed++;
      console.error(`  FAIL - ${name}\n    ${error?.message ?? error}`);
    });
}

function assertEqual(actual: unknown, expected: unknown, message?: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message ?? 'assertEqual failed'}\n    expected: ${e}\n    actual:   ${a}`);
  }
}

function assertIncludes(haystack: string, needle: string, message?: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`${message ?? 'assertIncludes failed'}\n    expected to include: ${needle}\n    actual: ${haystack}`);
  }
}

function createParser(): MarkdownIt {
  const md = new MarkdownIt();
  md.use(MarkdownItCommentPluginInstance.plugin)
    .use(MarkdownItImagePluginInstance.plugin)
    .use(MarkdownItWikiLinkPluginInstance.plugin)
    .use(MarkdownItCalloutPluginInstance.plugin)
    .use(MarkdownItTaskListPluginInstance.plugin)
    .use(MarkdownItHighlightPluginInstance.plugin)
    .use(CodeHighlightPluginInstance.plugin)
    .use(MarkdownItMermaidPluginInstance.plugin)
    .use(markdownItAnchorPlugin)
    .use(footnote);
  return md;
}

async function main(): Promise<void> {
  console.log('markdown rendering:');

  await test('bundled MathJax renders SVG equations and TeX extensions', () => {
    const md = new MarkdownIt().use(MarkdownItMathJax3PluginInstance.plugin);
    MarkdownItMathJax3PluginInstance.updateOutputType(MathJaxOutputType.SVG);
    try {
      const formulas = [
        String.raw`\frac{a}{b}`,
        String.raw`\ce{H2O}`,
        String.raw`\begin{pmatrix}1 & 2\\3 & 4\end{pmatrix}`,
      ];
      for (const formula of formulas) {
        const html = md.renderInline(`$${formula}$`);
        assertIncludes(html, '<svg');
        assertEqual(html.includes('data-mjx-error'), false);
      }
    } finally {
      MarkdownItMathJax3PluginInstance.updateOutputType(MathJaxOutputType.TeX);
    }
  });

  await test('wikilink to an unpublished note is rendered as plain text', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(() => ({ exists: true }));
    MarkdownItWikiLinkPluginInstance.onUnresolved(() => {});
    assertEqual(md.renderInline('See [[some note]] here.'), 'See some note here.');
  });

  await test('wikilink with alias renders the alias', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(() => ({ exists: true }));
    assertEqual(md.renderInline('See [[some note|the note]] here.'), 'See the note here.');
  });

  await test('wikilink to a published note becomes a permalink', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(() => ({
      exists: true,
      permalink: 'https://example.com/the-post/'
    }));
    MarkdownItWikiLinkPluginInstance.onUnresolved(() => {});
    assertEqual(
      md.renderInline('See [[some note]].'),
      'See <a href="https://example.com/the-post/">some note</a>.'
    );
  });

  await test('wikilink with heading subpath appends an anchor', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(() => ({
      exists: true,
      permalink: 'https://example.com/the-post/',
      subpath: '第二节',
    }));
    MarkdownItWikiLinkPluginInstance.onUnresolved(() => {});
    const html = md.renderInline('See [[some note#第二节]].');
    assertEqual(html, 'See <a href="https://example.com/the-post/#%E7%AC%AC%E4%BA%8C%E8%8A%82">some note &gt; 第二节</a>.');
  });

  await test('wikilink to a missing note is reported and rendered as text', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(() => ({ exists: false }));
    MarkdownItWikiLinkPluginInstance.resetUnresolved();
    MarkdownItWikiLinkPluginInstance.onUnresolved(() => {});
    assertEqual(md.renderInline('See [[ghost]].'), 'See ghost.');
    assertEqual(MarkdownItWikiLinkPluginInstance.takeUnresolved(), [ 'ghost' ]);
  });

  await test('wikilinks inside code blocks are not converted', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(() => ({
      exists: true,
      permalink: 'https://example.com/x/'
    }));
    const html = md.render('`[[not a link]]`');
    assertIncludes(html, '[[not a link]]');
  });

  await test('callout becomes a styled div', () => {
    const md = createParser();
    const html = md.render('> [!warning] Watch out\n> content line\n> more content\n');
    assertIncludes(html, '<div class="callout callout-warning" data-callout="warning">');
    assertIncludes(html, '<p class="callout-title">⚠️ Watch out</p>');
    assertIncludes(html, 'content line');
    assertIncludes(html, 'more content');
    if (html.includes('blockquote')) {
      throw new Error('callout still contains blockquote');
    }
  });

  await test('callout without title uses the type name', () => {
    const md = createParser();
    const html = md.render('> [!info]\n> something\n');
    assertIncludes(html, '<p class="callout-title">ℹ️ info</p>');
  });

  await test('foldable callout becomes details/summary', () => {
    const md = createParser();
    const html = md.render('> [!example]- Collapsed\n> hidden content\n');
    assertIncludes(html, '<details class="callout callout-example" data-callout="example">');
    assertIncludes(html, '<summary class="callout-title">📑 Collapsed</summary>');
    assertIncludes(html, '<div class="callout-content">');
    assertIncludes(html, 'hidden content');
    if (html.includes(' open')) {
      throw new Error('collapsed callout should not be open');
    }
  });

  await test('expanded-by-default callout has open attribute', () => {
    const md = createParser();
    const html = md.render('> [!example]+ Expanded\n> content\n');
    assertIncludes(html, '<details');
    assertIncludes(html, 'open=""');
    assertIncludes(html, 'class="callout callout-example"');
    assertIncludes(html, 'data-callout="example"');
  });

  await test('regular blockquotes are untouched', () => {
    const md = createParser();
    const html = md.render('> just a quote\n');
    assertIncludes(html, '<blockquote>');
  });

  await test('task list items become checkboxes', () => {
    const md = createParser();
    const html = md.render('- [ ] buy milk\n- [x] done thing\n- plain item\n');
    assertIncludes(html, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled> buy milk</li>');
    assertIncludes(html, '<li class="task-list-item"><input type="checkbox" class="task-list-item-checkbox" disabled checked> done thing</li>');
    assertIncludes(html, '<li>plain item</li>');
  });

  await test('highlights become mark elements', () => {
    const md = createParser();
    assertEqual(md.renderInline('a ==highlighted== word'), 'a <mark>highlighted</mark> word');
  });

  await test('equals signs that are not highlights are untouched', () => {
    const md = createParser();
    assertEqual(md.renderInline('x = y'), 'x = y');
    assertEqual(md.renderInline('x == y'), 'x == y');
  });

  await test('mermaid fences become pre.mermaid blocks', () => {
    const md = createParser();
    const html = md.render('```mermaid\ngraph TD\n  A --> B\n```\n');
    assertIncludes(html, '<pre class="mermaid">');
    assertIncludes(html, 'graph TD');
  });

  await test('other code fences are untouched', () => {
    const md = createParser();
    const html = md.render('```ts\nconst a = 1;\n```\n');
    assertIncludes(html, 'language-ts');
  });

  await test('inline comments are dropped by default', () => {
    const md = createParser();
    MarkdownItCommentPluginInstance.updateConvertMode('ignore' as never);
    assertEqual(md.renderInline('before %%a comment%% after'), 'before  after');
  });

  await test('inline comments become HTML comments in HTML mode', () => {
    const md = createParser();
    MarkdownItCommentPluginInstance.updateConvertMode('html' as never);
    assertEqual(md.renderInline('before %%a comment%% after'), 'before <!-- a comment --> after');
    MarkdownItCommentPluginInstance.updateConvertMode('ignore' as never);
  });

  await test('multi-line comment blocks are dropped', () => {
    const md = createParser();
    MarkdownItCommentPluginInstance.updateConvertMode('ignore' as never);
    const html = md.render('before\n%%\nhidden line 1\nhidden line 2\n%%\nafter\n');
    if (html.includes('hidden')) {
      throw new Error(`comment leaked: ${html}`);
    }
    assertIncludes(html, 'before');
    assertIncludes(html, 'after');
  });

  await test('multi-line comment blocks become HTML comments in HTML mode', () => {
    const md = createParser();
    MarkdownItCommentPluginInstance.updateConvertMode('html' as never);
    const html = md.render('before\n%%\nhidden line\n%%\nafter\n');
    assertIncludes(html, '<!-- hidden line -->');
    MarkdownItCommentPluginInstance.updateConvertMode('ignore' as never);
  });

  await test('footnotes are rendered', () => {
    const md = createParser();
    const html = md.render('Text with a note[^1].\n\n[^1]: The note.\n');
    assertIncludes(html, 'footnote-ref');
    assertIncludes(html, 'The note.');
  });

  await test('wiki image embed with alt text renders img alt', () => {
    const md = createParser();
    assertEqual(
      md.renderInline('![[https://example.com/a.png|some picture]]'),
      '<img src="https://example.com/a.png" alt="some picture">'
    );
  });

  await test('wiki image embed with size renders dimensions', () => {
    const md = createParser();
    assertEqual(
      md.renderInline('![[https://example.com/a.png|300x200]]'),
      '<img src="https://example.com/a.png" width="300" height="200">'
    );
  });

  console.log('media refs:');

  await test('parses markdown images with title and parentheses', () => {
    const refs = getMediaRefs('![](\<img (1).png\> "the title")');
    assertEqual(refs.length, 1);
    assertEqual(refs[0].src, 'img (1).png');
    assertEqual(refs[0].syntax, 'markdown');
  });

  await test('parses markdown images with size in alt', () => {
    const refs = getMediaRefs('![alt|100x200](a.png)');
    assertEqual(refs[0].width, '100');
    assertEqual(refs[0].height, '200');
    assertEqual(refs[0].altText, 'alt');
  });

  await test('parses wiki embeds with size or alt', () => {
    const refs = getMediaRefs('![[a.png|300]] ![[b.png|some alt]] ![[c.png]]');
    assertEqual(refs.length, 3);
    assertEqual(refs[0].width, '300');
    assertEqual(refs[1].altText, 'some alt');
    assertEqual(refs[2].altText, undefined);
  });

  await test('detects http(s) urls', () => {
    const refs = getMediaRefs('![[https://example.com/a.png]] ![](http://example.com/b.png)');
    assertEqual(refs[0].isUrl, true);
    assertEqual(refs[1].isUrl, true);
  });

  await test('plain text links are not parsed as images', () => {
    assertEqual(getMediaRefs('just text').length, 0);
    assertEqual(getMediaRefs('[a normal link](https://example.com)').length, 0);
  });

  console.log('frontmatter & sections:');

  await test('strips frontmatter', () => {
    assertEqual(stripFrontmatter('---\ntitle: x\n---\nbody'), 'body');
  });

  await test('strips frontmatter with CRLF', () => {
    assertEqual(stripFrontmatter('---\r\ntitle: x\r\n---\r\nbody'), 'body');
  });

  await test('does not strip content when frontmatter is unterminated', () => {
    assertEqual(stripFrontmatter('---\nnot frontmatter'), '---\nnot frontmatter');
  });

  await test('a horizontal rule not at the start is untouched', () => {
    const content = 'text\n\n---\n\nmore';
    assertEqual(stripFrontmatter(content), content);
  });

  await test('extracts a heading section', () => {
    const content = '# One\none text\n## Two\ntwo text\n## Three\nthree text';
    assertEqual(extractSection(content, 'Two'), '## Two\ntwo text');
  });

  await test('extracts a block reference', () => {
    const content = 'first\n\nquoted line ^abc123\n\nafter';
    assertEqual(extractSection(content, '^abc123'), 'quoted line');
  });

  console.log('note embeds:');

  await test('expands note embeds recursively', async () => {
    const files: Record<string, string> = {
      'main.md': '# Main\n\n![[child]]\n',
      'child.md': 'child content ![[grandchild.png]]',
      'grandchild.png': 'PNGDATA',
    };
    const app = createFakeApp(files);
    const mainFile = new TFile('main.md');
    const result = await expandNoteEmbeds(app as never, mainFile, files[ 'main.md' ]);
    assertEqual(result.content, '# Main\n\nchild content ![[grandchild.png]]\n');
    assertEqual(result.failed, []);
  });

  await test('expands embeds with heading subpath', async () => {
    const files: Record<string, string> = {
      'main.md': 'start\n\n![[child#Section]]\n\nend',
      'child.md': '# Intro\nskip\n# Section\nwanted\nmore\n# Other\nno',
    };
    const app = createFakeApp(files);
    const result = await expandNoteEmbeds(app as never, new TFile('main.md'), files[ 'main.md' ]);
    assertEqual(result.content, 'start\n\n# Section\nwanted\nmore\n\nend');
  });

  await test('detects embed cycles', async () => {
    const files: Record<string, string> = {
      'a.md': 'A ![[b]]',
      'b.md': 'B ![[a]]',
    };
    const app = createFakeApp(files);
    const result = await expandNoteEmbeds(app as never, new TFile('a.md'), files[ 'a.md' ]);
    assertEqual(result.failed.length, 1);
  });

  await test('leaves non-markdown embeds alone', async () => {
    const files: Record<string, string> = {
      'main.md': 'see ![[image.png]]',
      'image.png': 'PNG',
    };
    const app = createFakeApp(files);
    const result = await expandNoteEmbeds(app as never, new TFile('main.md'), files[ 'main.md' ]);
    assertEqual(result.content, 'see ![[image.png]]');
  });

  await test('does not expand embeds inside inline code', async () => {
    const files: Record<string, string> = {
      'main.md': 'syntax: `![[child]]` and ![[child]]',
      'child.md': 'child content',
    };
    const app = createFakeApp(files);
    const result = await expandNoteEmbeds(app as never, new TFile('main.md'), files[ 'main.md' ]);
    assertEqual(result.content, 'syntax: `![[child]]` and child content');
    assertEqual(result.failed, []);
  });

  await test('does not expand embeds inside code fences', async () => {
    const files: Record<string, string> = {
      'main.md': '```\n![[child]]\n```\n\n![[child]]',
      'child.md': 'child content',
    };
    const app = createFakeApp(files);
    const result = await expandNoteEmbeds(app as never, new TFile('main.md'), files[ 'main.md' ]);
    assertEqual(result.content, '```\n![[child]]\n```\n\nchild content');
    assertEqual(result.failed, []);
  });

  await test('does not treat embeds in code as media refs', () => {
    const refs = getMediaRefs('code: `![[a.png]]` fence:\n\n```\n![[b.png]]\n```\n\nreal: ![[c.png]]');
    assertEqual(refs.length, 1);
    assertEqual(refs[0].src, 'c.png');
  });

  console.log('wikilink resolver:');

  await test('resolves published targets to permalinks', () => {
    const files: Record<string, string> = {
      'target.md': 'content',
    };
    const app = createFakeApp(files, {
      'target.md': { profileName: 'Blog', postLink: 'https://example.com/target/' },
    });
    const resolver = createWikiLinkResolver(app as never, { name: 'Blog' } as never, new TFile('main.md'));
    const resolution: WikiLinkResolution | undefined = resolver('target');
    assertEqual(resolution?.permalink, 'https://example.com/target/');
  });

  await test('does not resolve targets published with another profile', () => {
    const files: Record<string, string> = {
      'target.md': 'content',
    };
    const app = createFakeApp(files, {
      'target.md': { profileName: 'Other', postLink: 'https://other.example.com/target/' },
    });
    const resolver = createWikiLinkResolver(app as never, { name: 'Blog' } as never, new TFile('main.md'));
    assertEqual(resolver('target')?.permalink, undefined);
  });

  await test('splits wikilink targets', () => {
    assertEqual(splitWikiLinkTarget('note#head'), [ 'note', 'head' ]);
    assertEqual(splitWikiLinkTarget('note'), [ 'note', undefined ]);
  });

  console.log('mime types:');

  await test('resolves mime types by extension', () => {
    assertEqual(mimeTypeFor(new TFile('a.png')), 'image/png');
    assertEqual(mimeTypeFor(new TFile('a.mp4')), 'video/mp4');
    assertEqual(mimeTypeFor(new TFile('a.pdf')), 'application/pdf');
    assertEqual(mimeTypeFor(new TFile('a.weird')), 'application/octet-stream');
  });

  console.log('publish-time rendering:');

  await test('code fences are highlighted with hljs classes', () => {
    const md = createParser();
    const html = md.render('```ts\nconst a = 1;\n```\n');
    assertIncludes(html, 'hljs-keyword');
    assertIncludes(html, 'language-ts');
  });

  await test('unknown languages stay plain escaped code', () => {
    const md = createParser();
    const html = md.render('```weirdlang\na < b\n```\n');
    if (html.includes('hljs-')) {
      throw new Error(`unexpected highlighting: ${html}`);
    }
    assertIncludes(html, 'a &lt; b');
  });

  await test('embedded styles are injected when the post needs them', () => {
    const md = createParser();
    const withCode = md.render('```ts\nconst a = 1;\n```\n');
    assertIncludes(ensureEmbeddedStyles(withCode), '<style>');
    const withCallout = md.render('> [!note] T\n> c\n');
    assertIncludes(ensureEmbeddedStyles(withCallout), 'data-callout="note"');
    assertEqual(ensureEmbeddedStyles('<p>plain text</p>'), '<p>plain text</p>');
  });

  await test('mermaid fences are replaced with inline SVG at publish time', async () => {
    const md = createParser();
    const source = 'before\n\n```mermaid\ngraph TD\nA-->B\n```\n\nafter';
    const result = await renderMermaidDiagrams(source, async () => '<svg>fake-diagram</svg>');
    assertEqual(result.failed, []);
    const html = md.render(result.content, { mermaidSvgs: result.svgs });
    assertIncludes(html, '<svg>fake-diagram</svg>');
    assertIncludes(html, wrapMermaidSvg('<svg>fake-diagram</svg>'));
    if (html.includes('```')) {
      throw new Error(`fence leaked: ${html}`);
    }
  });

  await test('each mermaid block gets its own rendered SVG', async () => {
    const md = createParser();
    const source = '```mermaid\nA\n```\n\n```mermaid\nB\n```';
    let calls = 0;
    const result = await renderMermaidDiagrams(source, async (code) => {
      calls++;
      return `<svg>${code.trim()}</svg>`;
    });
    assertEqual(calls, 2);
    const html = md.render(result.content, { mermaidSvgs: result.svgs });
    assertIncludes(html, '<svg>A</svg>');
    assertIncludes(html, '<svg>B</svg>');
  });

  await test('failed mermaid renders keep the original fence', async () => {
    const md = createParser();
    const source = '```mermaid\ngraph TD\nA-->B\n```';
    const result = await renderMermaidDiagrams(source, async () => {
      throw new Error('syntax error');
    });
    assertEqual(result.failed.length, 1);
    const html = md.render(result.content, { mermaidSvgs: result.svgs });
    assertIncludes(html, '<pre class="mermaid">');
    assertIncludes(html, 'graph TD');
  });

  await test('tilde fences and unterminated fences are handled', async () => {
    const result = await renderMermaidDiagrams(
      '~~~mermaid\nA\n~~~\n\n```mermaid\nB\n',
      async () => '<svg/>'
    );
    // only the terminated tilde block is rendered; the unterminated one is left alone
    assertEqual(result.failed, []);
    const placeholderCount = (result.content.match(/```ob-mermaid/g) ?? []).length;
    assertEqual(placeholderCount, 1);
    assertIncludes(result.content, '```mermaid');
  });

  await test('content without mermaid fences is untouched', async () => {
    const source = 'plain\n\n```ts\nconst a = 1;\n```\n';
    const result = await renderMermaidDiagrams(source, async () => '<svg/>');
    assertEqual(result.content, source);
  });

  await test('rendered SVG is flattened to a single line', async () => {
    const result = await renderMermaidDiagrams(
      '```mermaid\ngraph TD\nA-->B\n```',
      async () => '<svg>\n<style>.a{color:#333}\n.fill{x:1}</style>\n<g>\n<text>A</text>\n</g>\n</svg>'
    );
    assertEqual(result.rendered, 1);
    const fence = result.content.match(/```ob-mermaid\n([^\n]+)\n```/);
    if (!fence) {
      throw new Error(`placeholder fence missing: ${result.content}`);
    }
    const svg = result.svgs.get(fence[1]);
    if (svg === undefined) {
      throw new Error('svg not stored for the placeholder');
    }
    if (svg.includes('\n')) {
      throw new Error(`svg still contains newlines: ${svg.slice(0, 120)}`);
    }
    assertIncludes(svg, '<text>A</text>');
  });

  await test('style and HTML labels stay inside the wpautop-protected container', async () => {
    const md = createParser();
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><style>.node{fill:#eee}</style><g class="node"><rect width="100" height="30"/><foreignObject width="100" height="30"><div xmlns="http://www.w3.org/1999/xhtml"><p>中文标签</p></div></foreignObject></g></svg>';
    const result = await renderMermaidDiagrams('before\n\n```mermaid\ngraph TD\nA-->B\n```\n\nafter', async () => svg);
    assertEqual(md.render(result.content, { mermaidSvgs: result.svgs }), `<p>before</p>\n${wrapMermaidSvg(svg)}<p>after</p>\n`);
    // Failed renders still use pre.mermaid; successful diagrams have a
    // distinct class so site-side Mermaid scripts do not parse SVG as code.
    assertEqual(wrapMermaidSvg(svg).includes('class="mermaid"'), false);
  });

  await test('resolver prefers in-memory published links over the stale cache', () => {
    const files: Record<string, string> = { 'target.md': 'content' };
    const app = createFakeApp(files, {
      // frontmatter without postLink yet (cache not re-indexed)
      'target.md': { profileName: 'Blog' },
    });
    const publishedLinks = new Map([ ['target.md', 'https://example.com/fresh/'] ]);
    const resolver = createWikiLinkResolver(app as never, { name: 'Blog' } as never, new TFile('main.md'), publishedLinks);
    assertEqual(resolver('target')?.permalink, 'https://example.com/fresh/');
  });

  console.log('linked note targets:');

  await test('collects wikilink targets without embeds, code and aliases', () => {
    const content = [
      'link: [[target-one]]',
      'alias: [[target-two|the alias]]',
      'heading: [[target-three#sec|go]]',
      'embed: ![[not-a-link.png]]',
      'code: `[[not-a-link-either]]`',
      'fence:',
      '```',
      '[[also-not-a-link]]',
      '```',
      'dup: [[target-one]]',
    ].join('\n');
    assertEqual(collectWikiLinkTargets(content), [ 'target-one', 'target-two', 'target-three' ]);
  });

  await test('collects nothing from content without wikilinks', () => {
    assertEqual(collectWikiLinkTargets('no links here, only [md](links)').length, 0);
  });

  console.log('publication regressions:');
  await test('ignores hidden, escaped, indented, quoted and multiline-code references', () => {
    const content = '%% [[secret]] ![[private.png]] %%\n\n\\[[escaped]]\n\n    [[indented]]\n\n> ```\n> [[quoted]]\n> ```\n\n`across\n[[multiline]]`\n\n[[visible]] ![[visible.png]]';
    assertEqual(collectWikiLinkTargets(content), ['visible']);
    assertEqual(getMediaRefs(content).map(ref => ref.src), ['visible.png']);
    assertEqual(collectWikiLinkTargets('`unmatched\n\n[[visible]]\n\n`separate paragraph'),['visible']);
  });
  await test('missing embed sections never fall back to private full content', async () => {
    const files = {'main.md':'![[secret#Public]]','secret.md':'# Private\nconfidential'};
    const result = await expandNoteEmbeds(createFakeApp(files) as never,new TFile('main.md'),files['main.md']);
    assertEqual(result.failed,['secret#Public']);
    assertEqual(result.content.includes('confidential'),false);
    assertEqual(getMediaRefs(result.content),[]);
  });
  await test('deep and cyclic embeds are safe placeholders rather than media', async () => {
    const files: Record<string,string> = {'main.md':'![[main]] ![[deep]]','deep.md':'deep'};
    const app = createFakeApp(files);
    const cyclic = await expandNoteEmbeds(app as never,new TFile('main.md'),files['main.md']);
    assertEqual(cyclic.failed,['main']);
    assertEqual(getMediaRefs(cyclic.content),[]);
    const deep = await expandNoteEmbeds(app as never,new TFile('main.md'),'![[deep]]',{depth:5});
    assertEqual(deep.failed,['deep']);
    assertEqual(getMediaRefs(deep.content),[]);
  });
  await test('embedded references retain the child note directory and link display', async () => {
    const files = {'root/main.md':'![[child/embed]]','root/child/embed.md':'![[img.png]] ![alt](img.png "caption") [[target]]','root/img.png':'wrong','root/target.md':'wrong','root/child/img.png':'right','root/child/target.md':'right'};
    const app = createFakeApp(files,{'root/child/target.md':{postLink:'https://child.example/target/'},'root/target.md':{postLink:'https://wrong.example/target/'}});
    const result = await expandNoteEmbeds(app as never,new TFile('root/main.md'),files['root/main.md']);
    assertEqual(getMediaRefs(result.content).map(ref=>ref.src),['root/child/img.png','root/child/img.png']);
    assertEqual(collectWikiLinkTargets(result.content),['root/child/target.md']);
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(createWikiLinkResolver(app as never,{name:'Blog'} as never,new TFile('root/main.md')));
    assertIncludes(md.render(result.content),'<a href="https://child.example/target/">target</a>');
  });
  await test('media positions preserve identical syntax in earlier code examples', () => {
    const source = '`![[img.png]]`\n\n![[img.png]]\n\n![[img.png]]';
    const result = replaceContentRanges(source,getMediaRefs(source).map(ref=>({...ref,replacement:'REMOTE'})));
    assertEqual(result,'`![[img.png]]`\n\nREMOTE\n\nREMOTE');
  });
  await test('heading and block wikilinks have matching targets with unique heading ids', () => {
    const md = createParser();
    MarkdownItWikiLinkPluginInstance.setResolver(()=>({exists:true,permalink:'https://site/post/'}));
    const html = md.render('# A heading\n\n# A heading\n\n# A heading-2\n\nparagraph ^block\n\n[[note#A heading]] [[note#^block]]');
    assertIncludes(html,'id="A-heading"');
    assertIncludes(html,'id="A-heading-2"');
    assertIncludes(html,'id="A-heading-2-2"');
    assertIncludes(html,'id="^block"');
    assertIncludes(html,'href="https://site/post/#A-heading"');
    assertIncludes(html,'href="https://site/post/#%5Eblock"');
  });
  await test('image attributes escape quotes and cannot insert extra HTML attributes', () => {
    const html = createParser().renderInline('![[https://site/img.png|say "hi" onload="attack]]');
    assertIncludes(html,'alt="say &quot;hi&quot; onload=&quot;attack"');
    assertEqual(html.includes(' onload="'),false);
  });
  await test('remember flags control persistence without deleting in-memory credentials', async () => {
    const profile = makeProfile('https://site.example');
    profile.username='temporary-user';profile.password='temporary-password';
    profile.encryptedPassword={encrypted:'stale'};
    const saved = await settingsForPersistence({...DEFAULT_SETTINGS,profiles:[profile]});
    assertEqual(saved.profiles[0].username,undefined);
    assertEqual(saved.profiles[0].password,undefined);
    assertEqual(saved.profiles[0].encryptedPassword,undefined);
    assertEqual(profile.password,'temporary-password');
    profile.saveUsername=true;profile.savePassword=true;
    const remembered = await settingsForPersistence({...DEFAULT_SETTINGS,profiles:[profile]});
    assertEqual(remembered.profiles[0].username,'temporary-user');
    assertEqual(remembered.profiles[0].password,undefined);
    assertEqual(Boolean(remembered.profiles[0].encryptedPassword?.key),true);
  });
  await test('interleaved Mermaid publications do not delete another post SVGs', async () => {
    let resume!: () => void;
    let ready!: () => void;
    const reached = new Promise<void>(resolve=>ready=resolve);
    const wait = new Promise<void>(resolve=>resume=resolve);
    const a = renderMermaidDiagrams('```mermaid\nA\n```\n\n```mermaid\nB\n```',async code=>{
      if (code==='A') {ready();await wait;}
      return `<svg>${code}</svg>`;
    });
    await reached;
    const b = await renderMermaidDiagrams('```mermaid\nC\n```',async()=>'<svg>C</svg>');
    resume();
    const result = await a;
    const md = createParser();
    const html = md.render(result.content,{mermaidSvgs:result.svgs});
    assertIncludes(html,'<svg>A</svg>');assertIncludes(html,'<svg>B</svg>');
    assertIncludes(md.render(b.content,{mermaidSvgs:b.svgs}),'<svg>C</svg>');
  });
  await test('media uploads are scoped to site/account and cache limits keep the newest entry', async () => {
    const files = {'main.md':'![[img.png]]','img.png':'image'};
    const a=makeProfile('https://a.example');
    const plugin=makePublishingPlugin(files,a);
    const clientA=new FakeWordPressClient(plugin,a);
    const params=defaultParams();params.content=files['main.md'];
    await (clientA as SafeAny).updatePostImages({postParams:params,auth:{},sourceFile:new TFile('main.md')});
    assertIncludes(params.content,'https://a.example/media/img.png');
    const b=makeProfile('https://b.example');
    const clientB=new FakeWordPressClient(plugin,b);
    const other=defaultParams();other.content=files['main.md'];
    await (clientB as SafeAny).updatePostImages({postParams:other,auth:{},sourceFile:new TFile('main.md')});
    assertEqual(clientB.uploads.length,1);
    assertIncludes(other.content,'https://b.example/media/img.png');
    plugin.settings.mediaUploadCache=Object.fromEntries(Array.from({length:1000},(_,i)=>[String(i),{url:'old',mtime:0}]));
    await (clientB as SafeAny).setCachedMediaUrl(new TFile('img.png'),'latest');
    assertEqual(await (clientB as SafeAny).getCachedMediaUrl(new TFile('img.png')),'latest');
    b.username='temporary-account';
    await (clientB as SafeAny).setCachedMediaUrl(new TFile('img.png'),'account-media');
    assertEqual(JSON.stringify(plugin.settings.mediaUploadCache).includes('temporary-account'),false);
  });
  await test('actual media conversion/writeback preserves code and concurrent source edits', async () => {
    const files = {'main.md':'`![[img.png]]`\n\n![[img.png]]','img.png':'image'};
    const profile=makeProfile('https://site.example');
    const plugin=makePublishingPlugin(files,profile);
    plugin.settings.replaceMediaLinks=true;
    const client=new FakeWordPressClient(plugin,profile);
    client.onUpload=()=>{files['main.md']+='\n\nnew user edit';};
    const params=defaultParams();params.content=files['main.md'];
    await (client as SafeAny).updatePostImages({postParams:params,auth:{},sourceFile:new TFile('main.md')});
    assertEqual(params.content,'`![[img.png]]`\n\n![[https://site.example/media/img.png]]');
    assertEqual(files['main.md'],params.content+'\n\nnew user edit');
  });
  await test('unexpanded Markdown notes are excluded from binary media uploads', async () => {
    const files = {'main.md':'![[private]]','private.md':'private content'};
    const profile=makeProfile('https://site.example');
    const client=new FakeWordPressClient(makePublishingPlugin(files,profile),profile);
    const params=defaultParams();params.content=files['main.md'];
    await (client as SafeAny).updatePostImages({postParams:params,auth:{},sourceFile:new TFile('main.md')});
    assertEqual(client.uploads,[]);
  });
  await test('cancelling the main publish dialog creates no linked posts', async () => {
    const files={'main.md':'[[child]]','child.md':'child'};
    const profile=makeProfile('https://site.example');
    const client=new FakeWordPressClient(makePublishingPlugin(files,profile),profile);
    Modal.openHook=modal=>{assertEqual(client.published,[]);modal.close();};
    try {assertEqual((await client.publishPost()).code,WordPressClientReturnCode.Error);}
    finally {Modal.openHook=undefined;}
    assertEqual(client.published,[]);
  });
  await test('linked posts are published only after submitting the main dialog', async () => {
    const files={'main.md':'[[child]]','child.md':'child'};
    const profile=makeProfile('https://site.example');
    const client=new FakeWordPressClient(makePublishingPlugin(files,profile),profile);
    Modal.openHook=modal=>{
      assertEqual(client.published,[]);
      (modal as SafeAny).onSubmit(defaultParams(),()=>{});
    };
    try {assertEqual((await client.publishPost()).code,WordPressClientReturnCode.OK);}
    finally {Modal.openHook=undefined;}
    assertEqual(client.published.map(post=>post.title),['child','main']);
    assertIncludes(client.published[1].content,'https://site.example/posts/1/');
  });
  await test('choosing the original profile preserves the originally captured note', async () => {
    const files={'main.md':'original','other.md':'other'};
    const current=makeProfile('https://current.example');
    const original=makeProfile('https://original.example');original.name='Original';original.username='test';original.password='test';
    const plugin=makePublishingPlugin(files,current,{'main.md':{profileName:original.name,postId:'7'}});
    plugin.settings.profiles.push(original);
    const client=new FakeWordPressClient(plugin,current);
    const requests:SafeAny[]=[];
    setRequestUrlHandler(request=>{
      const req=request as SafeAny;requests.push(req);
      return {json:req.method==='POST'?{id:7,link:'https://original.example/post/7/'}:{id:1}};
    });
    Modal.openHook=modal=>{
      plugin.app.workspace.getActiveFile=()=>new TFile('other.md');
      (modal as SafeAny).onAction(ConfirmCode.Cancel,modal);
    };
    try {assertEqual((await client.publishPost(defaultParams())).code,WordPressClientReturnCode.OK);}
    finally {Modal.openHook=undefined;setRequestUrlHandler();}
    const submitted=JSON.parse(requests.find(req=>req.method==='POST').body);
    assertEqual(submitted.title,'main');assertIncludes(submitted.content,'original');
  });
  await test('concurrent publications resolve links against their own captured notes', async () => {
    const files={'a/main.md':'[[target]]','b/main.md':'[[target]]','a/target.md':'A','b/target.md':'B'};
    const profile=makeProfile('https://site.example');
    const plugin=makePublishingPlugin(files,profile,{'a/target.md':{postLink:'https://site/A/'},'b/target.md':{postLink:'https://site/B/'}});
    plugin.settings.autoPublishLinkedNotes=false;
    let active=new TFile('a/main.md');plugin.app.workspace.getActiveFile=()=>active;
    const client=new FakeWordPressClient(plugin,profile);
    const a=client.publishPost(defaultParams());
    active=new TFile('b/main.md');
    const b=client.publishPost(defaultParams());
    await Promise.all([a,b]);
    assertEqual(client.published.length,2);
    assertEqual(client.published.filter(post=>post.content.includes('https://site/A/')).length,1);
    assertEqual(client.published.filter(post=>post.content.includes('https://site/B/')).length,1);
  });

  console.log('batch publishing:');
  await test('folder selection includes descendants, deduplicates notes and respects path boundaries', () => {
    const files = {'folder/a.md':'','folder/sub/b.md':'','folder-other/c.md':'','folder/img.png':'','elsewhere.md':''};
    const app = createFakeApp(files) as SafeAny;
    assertEqual(collectBatchFiles(app,[new TFolder('folder'),new TFile('folder/a.md')]).map(file=>file.path),['folder/a.md','folder/sub/b.md']);
    assertEqual(collectBatchFiles(app,[new TFolder('/')]).length,4);
    assertEqual(collectBatchFiles(app,[new TFolder('empty')]),[]);
  });
  await test('read-only preflight recursively lists wiki, embedded and Markdown references and attachments', async () => {
    const files = {'main.md':'---\nprivate: [[secret]]\n---\n[[child]] ![[embed]] [third][ref]\n\n[ref]: third.md\n\n%% [[secret]] %%\n`[[secret]]`\\[[secret]]\n\n    [[secret]]',
      'child.md':'[PDF](manual.pdf) ![image](<pic (1).png>)','embed.md':'[[child]]', 'third.md':'[[child]]',
      'secret.md':'private','manual.pdf':'pdf','pic (1).png':'image'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    const plan = await buildBatchPublishPlan(plugin.app,[new TFile('main.md'),new TFile('child.md')],profile);
    assertEqual(plan.entries.map(entry=>entry.file.path).sort(),['child.md','embed.md','main.md','third.md']);
    assertEqual(plan.entries.filter(entry=>entry.selected).length,2);
    assertEqual(plan.attachments.map(file=>file.path),['manual.pdf','pic (1).png']);
    assertEqual(client.published.length,0); assertEqual(client.uploads.length,0);
    assertEqual(Object.keys(plugin.app.metadataCache.getFileCache(new TFile('main.md'))??{}).length,0);
  });
  await test('batch uses the confirmed snapshot and does not auto-publish references added afterwards', async () => {
    const files = {'main.md':'[[child]]','child.md':'confirmed','secret.md':'private'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const plan = await buildBatchPublishPlan(plugin.app,[new TFile('main.md')],profile);
    files['child.md']='[[secret]] edited';
    files['main.md']='[[secret]] edited';
    plugin.app.workspace.getActiveFile=()=>new TFile('secret.md');
    const client = new FakeWordPressClient(plugin,profile);
    const result = await client.publishBatch(plan);
    assertEqual(result.items.map(item=>item.status),['success','success']);
    assertEqual(client.published.map(post=>post.title),['child','main']);
    assertIncludes(client.published[0].content,'confirmed');
    assertEqual(client.published.some(post=>post.content.includes('private')),false);
  });
  await test('batch uploads shared images and ordinary attachments once and resolves Markdown note links', async () => {
    const files = {'main.md':'[[child]] [child heading](child.md#A%20heading) ![[shared.png]] [PDF][ref]\n\n[ref]: file.pdf',
      'child.md':'# A heading\n![[shared.png]] [image](shared.png) [[file.pdf]]', 'shared.png':'image','file.pdf':'pdf'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('main.md'),new TFile('child.md')],profile),{status:PostStatus.Publish});
    assertEqual(result.items.filter(item=>item.status==='success').length,2);
    assertEqual(client.uploads.slice().sort(),['file.pdf','shared.png']);
    assertIncludes(client.published[1].content,'https://site.example/posts/1/#A-heading');
    assertIncludes(client.published[1].content,'https://site.example/media/file.pdf');
    assertEqual(client.published.every(post=>post.params?.status===PostStatus.Publish),true);
    assertEqual(client.published.length,2);
  });
  await test('cyclic references get a link repair with the original post ID instead of duplicate creation', async () => {
    const files = {'a.md':'[[b]]','b.md':'[a](a.md)'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('a.md')],profile));
    assertEqual(result.items.filter(item=>item.status==='success').length,2);
    assertEqual(client.published.map(post=>post.title),['b','a','b']);
    assertEqual(client.published[2].params?.postId,'1');
    assertIncludes(client.published[1].content,'https://site.example/posts/1/');
    assertIncludes(client.published[2].content,'https://site.example/posts/2/');
  });
  await test('batch creates on the selected account without reusing another profile post ID', async () => {
    const files = {'old.md':'old','same.md':'same'};
    const profile = makeProfile('https://site.example');
    const matter = {'old.md':{profileName:'Other',postId:'99',categories:[88]},'same.md':{profileName:profile.name,postId:'7'}};
    const plugin = makePublishingPlugin(files,profile,matter);
    const client = new FakeWordPressClient(plugin,profile);
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('old.md'),new TFile('same.md')],profile));
    assertEqual(result.items.every(item=>item.status==='success'),true);
    assertEqual(client.published[0].params?.postId,undefined); assertEqual(client.published[0].params?.categories,[1]);
    assertEqual(client.published[1].params?.postId,'7');
    assertEqual(matter['old.md'].profileName,profile.name);
  });
  await test('batch isolates article failures, reports dependents and continues independent notes', async () => {
    const files = {'main.md':'[[bad]]','bad.md':'bad','independent.md':'ok'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    const original = client.publish.bind(client);
    client.publish=async(title,content,params)=>title==='bad' ? {code:WordPressClientReturnCode.Error,error:{code:'blocked',message:'server refused'}} : original(title,content,params);
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('main.md'),new TFile('independent.md')],profile));
    assertEqual(result.items.map(item=>[item.path,item.status]),[['bad.md','failed'],['main.md','failed'],['independent.md','success']]);
    assertEqual(client.published.map(post=>post.title),['independent']);
  });
  await test('a failed attachment upload is reported without publishing a broken article', async () => {
    const files = {'main.md':'[PDF](file.pdf)','file.pdf':'pdf'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    client.uploadMedia=async()=>({code:WordPressClientReturnCode.Error,error:{code:'blocked',message:'upload refused'}});
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('main.md')],profile));
    assertEqual(result.items[0].status,'failed'); assertIncludes(result.items[0].error??'','upload refused');
    assertEqual(client.published.length,0);
  });
  await test('stopping a batch completes the current article and leaves later articles unexecuted', async () => {
    const files = {'a.md':'a','b.md':'b'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    let stop=false;
    const original = client.publish.bind(client);
    client.publish=async(title,content,params)=>{const result=await original(title,content,params);stop=true;return result;};
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('a.md'),new TFile('b.md')],profile),{shouldCancel:()=>stop});
    assertEqual(result.cancelled,true);
    assertEqual(result.items.map(item=>item.status),['success','skipped']);
    assertEqual(client.published.length,1);
  });
  await test('cancelled batch before execution does not upload or publish anything', async () => {
    const files = {'a.md':'![[image.png]]','image.png':'image'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    const result = await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('a.md')],profile),{shouldCancel:()=>true});
    assertEqual(result.items[0].status,'skipped');
    assertEqual(client.published.length+client.uploads.length,0);
  });
  await test('login is requested only once for a batch and closing login settles its promise', async () => {
    const files = {'a.md':'a','b.md':'b'};
    const profile = makeProfile('https://site.example');
    const plugin = makePublishingPlugin(files,profile);
    const client = new FakeWordPressClient(plugin,profile);
    (client as SafeAny).needLogin=()=>true;
    let prompts=0;
    Modal.openHook=modal=>{if (modal instanceof WpLoginModal) {prompts++;void (modal as SafeAny).onSubmit({username:'temporary',password:'temporary'},modal);}};
    try {await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('a.md'),new TFile('b.md')],profile));}
    finally {Modal.openHook=undefined;}
    assertEqual(prompts,1); assertEqual(client.published.length,2);
    assertEqual((await settingsForPersistence(plugin.settings)).profiles[0].username,undefined);
    Modal.openHook=modal=>modal.close();
    let rejected=false;
    try {await openLoginModal(plugin,profile,async()=>true);} catch {rejected=true;} finally {Modal.openHook=undefined;}
    assertEqual(rejected,true);
  });
  await test('nested image links and reference-style links are scanned without altering code or definitions', () => {
    const content='[![pic](image.png)](article.md) [PDF][ref]\n\n[ref]: file.pdf\n\n`[code](secret.md)`\n%% [[private]] %%';
    assertEqual(getFileReferences(content).map(ref=>ref.src).sort(),['article.md','file.pdf','image.png']);
  });
  await test('embedded image links preserve both child paths without overlapping replacements', async () => {
    const files={'root/main.md':'![[child/embed]]','root/child/embed.md':'[![pic](image.png)](article.md)',
      'root/child/image.png':'right','root/child/article.md':'right','root/image.png':'wrong','root/article.md':'wrong'};
    const app=createFakeApp(files) as SafeAny;
    const expanded=await expandNoteEmbeds(app,new TFile('root/main.md'),files['root/main.md']);
    assertEqual(expanded.content,'[![pic](<root/child/image.png>)](<root/child/article.md>)');
    const profile=makeProfile('https://site.example');
    const plugin=makePublishingPlugin(files,profile);
    const client=new FakeWordPressClient(plugin,profile);
    const result=await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('root/main.md')],profile));
    assertEqual(result.items.every(item=>item.status==='success'),true);
    assertEqual(client.uploads,['image.png']);
    const mainPost=client.published.find(post=>post.title==='main');
    assertIncludes(mainPost?.content??'','<a href="https://site.example/posts/1/"><img');
    assertEqual(mainPost?.content.includes('](article.md)'),false);
  });
  await test('plugin registers batch menu entries and unloading cancels the active batch window', async () => {
    const files={'folder/a.md':'a','folder/sub/b.md':'b','other.md':'other'};
    const profile=makeProfile('https://site.example');
    const plugin=new WordpressPlugin() as SafeAny;
    plugin.app=createFakeApp(files);
    const listeners:Record<string,(menu:SafeAny,files:SafeAny)=>void>={};
    plugin.app.workspace={on:(event:string,callback:SafeAny)=>{listeners[event]=callback;}};
    plugin.loadData=async()=>({...DEFAULT_SETTINGS,version:'2',profiles:[profile]});
    plugin.saveData=async()=>{};
    await plugin.onload();
    assertEqual(plugin.commands.some((command:SafeAny)=>command.id==='batchPublish'),true);
    let action:()=>void=()=>{throw new Error('no batch menu item');};
    let menuItems=0;
    const menu={addItem:(callback:SafeAny)=>{menuItems++;return callback({setTitle(){return this;},setIcon(){return this;},onClick(fn:()=>void){action=fn;}});}};
    const selected=[new TFile('folder/a.md'),new TFile('folder/sub/b.md')];
    listeners['file-menu'](menu,selected[0]);
    listeners['files-menu'](menu,selected);
    listeners['file-menu'](menu,selected[0]);
    selected.length=0;
    let opened:SafeAny;
    Modal.openHook=modal=>{opened=modal;};
    try {action();} finally {Modal.openHook=undefined;}
    assertEqual([...opened.selected].sort(),['folder/a.md','folder/sub/b.md']);
    assertEqual(menuItems,1);
    plugin.onunload();
    assertEqual(opened.cancelled,true);
    assertEqual(plugin.batchOpen,false);
  });
  await test('folder context opens with its folder and all descendant Markdown notes selected', async () => {
    const files={'folder/a.md':'a','folder/sub/b.md':'b','folder/image.png':'image','folder-other/c.md':'c'};
    const profile=makeProfile('https://site.example');
    const plugin=new WordpressPlugin() as SafeAny;
    plugin.app=createFakeApp(files);
    const listeners:Record<string,(menu:SafeAny,file:SafeAny)=>void>={};
    plugin.app.workspace={on:(event:string,callback:SafeAny)=>{listeners[event]=callback;}};
    plugin.loadData=async()=>({...DEFAULT_SETTINGS,version:'2',profiles:[profile]});
    plugin.saveData=async()=>{};
    await plugin.onload();
    let action!:()=>void;
    const menu={addItem:(callback:SafeAny)=>callback({setTitle(){return this;},setIcon(){return this;},onClick(fn:()=>void){action=fn;}})};
    listeners['file-menu'](menu,new TFolder('folder'));
    let opened:SafeAny;
    Modal.openHook=modal=>{opened=modal;};
    try {action();} finally {Modal.openHook=undefined;}
    assertEqual(opened.folder,'folder');
    assertEqual([...opened.selected].sort(),['folder/a.md','folder/sub/b.md']);
    plugin.onunload();
  });
  await test('attachment links preserve their original fragments after uploading once', async () => {
    const files={'main.md':'[PDF](file.pdf#page=3) [[file.pdf#page=5|第五页]] ![[file.pdf#page=7]]','file.pdf':'pdf'};
    const profile=makeProfile('https://site.example');
    const plugin=makePublishingPlugin(files,profile);
    const client=new FakeWordPressClient(plugin,profile);
    const result=await client.publishBatch(await buildBatchPublishPlan(plugin.app,[new TFile('main.md')],profile));
    assertEqual(result.items[0].status,'success');assertEqual(client.uploads,['file.pdf']);
    for (const page of [3,5,7]) assertIncludes(client.published[0].content,`https://site.example/media/file.pdf#page=${page}`);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function makeProfile(endpoint:string): WpProfile {
  return {name:endpoint,endpoint,apiType:ApiType.RestApi_ApplicationPasswords,saveUsername:false,savePassword:false,isDefault:true,lastSelectedCategories:[1]};
}
function defaultParams(): WordPressPostParams {
  return {title:'',content:'',status:DEFAULT_SETTINGS.defaultPostStatus,commentStatus:DEFAULT_SETTINGS.defaultCommentStatus,categories:[1],postType:'post',tags:[]};
}
function makePublishingPlugin(files:Record<string,string>, profile:WpProfile, matter:Record<string,Record<string,unknown>> = {}): SafeAny {
  const app=createFakeApp(files,matter) as SafeAny;
  app.workspace={getActiveFile:()=>new TFile(Object.keys(files)[0])};
  app.vault.readBinary=async()=>new Uint8Array([1,2,3]).buffer;
  app.vault.process=async(file:TFile,fn:(text:string)=>string)=>{files[file.path]=fn(files[file.path]);};
  app.fileManager={processFrontMatter:async(file:TFile,fn:(fm:SafeAny)=>void)=>{fn(matter[file.path]??= {});}};
  return {app,settings:{...DEFAULT_SETTINGS,autoPublishLinkedNotes:true,profiles:[profile]},i18n:{t:(key:string)=>key},saveSettings:async()=>{}};
}
class FakeWordPressClient extends AbstractWordPressClient {
  published: Array<{title:string,content:string,params?:WordPressPostParams}> = [];
  uploads: string[] = [];
  onUpload?:()=>void;
  constructor(plugin:SafeAny,profile:WpProfile) {super(plugin,profile);}
  protected needLogin():boolean {return false;}
  async publish(title:string,content:string,params?:WordPressPostParams):Promise<SafeAny> {
    this.published.push({title,content,params:params?{...params}:undefined});
    const id=params?.postId??String(this.published.length);
    return {code:WordPressClientReturnCode.OK,data:{postId:id,link:`${this.profile.endpoint}/posts/${id}/`,categories:[1]}};
  }
  async getCategories():Promise<SafeAny[]> {return [];}
  async getPostTypes():Promise<string[]> {return ['post'];}
  async validateUser():Promise<SafeAny> {return {code:WordPressClientReturnCode.OK,data:true};}
  async getTag(name:string):Promise<SafeAny> {return {name,id:1};}
  async uploadMedia(media:SafeAny):Promise<SafeAny> {
    this.uploads.push(media.fileName);this.onUpload?.();
    return {code:WordPressClientReturnCode.OK,data:{url:`${this.profile.endpoint}/media/${media.fileName}`}};
  }
}

function createFakeApp(
  files: Record<string, string>,
  frontmatters: Record<string, Record<string, unknown>> = {}
): Record<string, unknown> {
  return {
    metadataCache: {
      getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null {
        // resolve relative to the source folder, then by suffix match (shortest path)
        const clean = linkpath.replace(/^\.\//, '');
        const folder = sourcePath.includes('/') ? sourcePath.replace(/\/[^/]+$/, '') + '/' : '';
        const candidates: string[] = [];
        for (const base of [ folder + clean, clean ]) {
          candidates.push(base);
          candidates.push(`${base}.md`);
        }
        for (const candidate of candidates) {
          if (candidate in files) {
            return new TFile(candidate);
          }
        }
        const suffixMatch = Object.keys(files).find(path => path.endsWith('/' + clean) || path === clean);
        return suffixMatch ? new TFile(suffixMatch) : null;
      },
      getFileCache(file: TFile): { frontmatter?: Record<string, unknown> } | null {
        const fm = frontmatters[ file.path ];
        return fm ? { frontmatter: fm } : null;
      },
    },
    vault: {
      getMarkdownFiles(): TFile[] {return Object.keys(files).filter(path=>path.toLowerCase().endsWith('.md')).map(path=>new TFile(path));},
      async read(file: TFile): Promise<string> {
        return files[ file.path ] ?? '';
      },
    },
  };
}

main();
