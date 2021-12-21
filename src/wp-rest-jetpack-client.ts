import { WordPressClient, WordPressClientResult, WordPressClientReturnCode } from './wp-client';
import { Client } from 'xmlrpc';
import { App, MarkdownView } from 'obsidian';
import WordpressPlugin from './main';
import WPAPI from 'wpapi';

export class WpRestJetpackClient implements WordPressClient {

  private readonly client: Client;

  constructor(
    private readonly app: App,
    private readonly plugin: WordpressPlugin
  ) {
    const url = new URL(plugin.settings.endpoint);
    console.log(url);
  }

  newPost(): Promise<WordPressClientResult> {
    return new Promise((resolve, reject) => {
      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        const endpoint = 'https://public-api.wordpress.com/rest/v1/sites/devbean.great-site.net/posts/';
        const wp = new WPAPI({ endpoint });
        wp.posts().then(function( data ) {
          console.log(data);
        }).catch(function( err ) {
          console.log(err);
        });
        resolve({
          code: WordPressClientReturnCode.OK,
          data: ''
        });
      } else {
        const error = 'There is no editor found. Nothing will be published.';
        console.warn(error);
        reject(new Error(error));
      }
    });
  }

}
