import { Events } from 'obsidian';
import MarkdownIt from 'markdown-it';
import { MarkdownItImagePluginInstance } from './markdown-it-image-plugin';
import { MarkdownItPlugin } from './types';

class AppStore {

  markdownParser = new MarkdownIt()
    .use(MarkdownItImagePluginInstance.plugin);

  events = new Events();

  codeVerifier: string | undefined;

  #markdownPlugins = new Map<string, MarkdownItPlugin>();

  registerMarkdownItPlugin(name: string, plugin: MarkdownItPlugin): void {
    this.#markdownPlugins.set(name, plugin);
  }

  getMarkdownItPlugin(name: string): MarkdownItPlugin | undefined {
    return this.#markdownPlugins.get(name);
  }
}

export const AppState = new AppStore();

