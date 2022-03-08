import { App } from 'obsidian';
import { WordPressClientResult } from './wp-client';
import WordpressPlugin from './main';
import { AbstractWordPressClient } from './abstract-wp-client';
import { WpRestClient } from './wp-rest-client';

export class WpRestMiniOrangeClient extends AbstractWordPressClient {

  private readonly client: WpRestClient;

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin
  ) {
    super(app, plugin);
    this.client = new WpRestClient({
      url: new URL(plugin.settings.endpoint)
    });
  }

  publish(title: string, content: string, wp: { userName: string; password: string }): Promise<WordPressClientResult> {
    return this.client.post(
      {
        title,
        content,
        status: 'draft'
      },
      {
        headers: {
          'Authorization': Buffer.from(`${wp.userName}:${wp.password}`).toString('base64')
        }
    });
  }

}
