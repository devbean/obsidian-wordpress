import { App } from 'obsidian';
import { WordPressClientResult } from './wp-client';
import WordpressPlugin from './main';
import { AbstractWordPressClient } from './abstract-wp-client';

export class WpRestMiniOrangeClient extends AbstractWordPressClient {

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin
  ) {
    super(app, plugin);
  }

  publish(title: string, content: string, wp: { userName: string; password: string }): Promise<WordPressClientResult> {
    return Promise.resolve(undefined);
  }

}
