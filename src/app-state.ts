import { Events } from 'obsidian';
import MarkdownIt from 'markdown-it';
import { MarkdownItImagePluginInstance } from './markdown-it-image-plugin';
import { MarkdownItCommentPluginInstance } from './markdown-it-comment-plugin';
import { MarkdownItMathJax3PluginInstance } from './markdown-it-mathjax3-plugin';

class AppStore {

  markdownParser = new MarkdownIt();

  events = new Events();

  codeVerifier: string | undefined;

}

export const AppState = new AppStore();

AppState.markdownParser
  .use(MarkdownItCommentPluginInstance.plugin)
  .use(MarkdownItMathJax3PluginInstance.plugin)
  .use(MarkdownItImagePluginInstance.plugin);
