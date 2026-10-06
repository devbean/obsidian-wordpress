import { Events } from 'obsidian';
import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import { MarkdownItImagePluginInstance } from './markdown-it-image-plugin';
import { MarkdownItCommentPluginInstance } from './markdown-it-comment-plugin';
import { MarkdownItMathJax3PluginInstance } from './markdown-it-mathjax3-plugin';
import { MarkdownItWikiLinkPluginInstance } from './markdown-it-wikilink-plugin';
import { MarkdownItCalloutPluginInstance } from './markdown-it-callout-plugin';
import { MarkdownItTaskListPluginInstance } from './markdown-it-tasklist-plugin';
import { MarkdownItHighlightPluginInstance } from './markdown-it-highlight-plugin';
import { MarkdownItMermaidPluginInstance } from './markdown-it-mermaid-plugin';
import { CodeHighlightPluginInstance } from './code-highlight';
import { markdownItAnchorPlugin } from './markdown-it-anchor-plugin';

class AppStore {

  markdownParser = new MarkdownIt();

  events = new Events();

  codeVerifier: string | undefined;

}

export const AppState = new AppStore();

AppState.markdownParser
  .use(MarkdownItCommentPluginInstance.plugin)
  .use(MarkdownItMathJax3PluginInstance.plugin)
  .use(MarkdownItImagePluginInstance.plugin)
  .use(MarkdownItWikiLinkPluginInstance.plugin)
  .use(MarkdownItCalloutPluginInstance.plugin)
  .use(MarkdownItTaskListPluginInstance.plugin)
  .use(MarkdownItHighlightPluginInstance.plugin)
  .use(CodeHighlightPluginInstance.plugin)
  .use(MarkdownItMermaidPluginInstance.plugin)
  .use(markdownItAnchorPlugin)
  .use(footnote);
