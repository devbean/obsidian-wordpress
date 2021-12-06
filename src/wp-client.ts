import { WordpressPluginSettings } from './settings';
import { Client, createClient, createSecureClient } from 'xmlrpc';
import { MarkdownView, Notice, Workspace } from 'obsidian';
import { marked } from 'marked';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: any; // eslint-disable-line
}

export interface WordPressClient {
  newPost(): Promise<WordPressClientResult>;
}

export function createWordPressClient(
  settings: WordpressPluginSettings,
  workspace: Workspace,
  type: 'xmlrpc'
): WordPressClient {
  switch (type) {
    case 'xmlrpc':
      return new WpXmlRpcClient(settings, workspace);
    default:
      return null;
  }
}

class WpXmlRpcClient implements WordPressClient {

  private readonly client: Client;

  constructor(
    private readonly settings: WordpressPluginSettings,
    private readonly workspace: Workspace
  ) {
    const url = new URL(settings.endpoint);
    console.log(url);
    if (url.protocol === 'https:') {
      this.client = createSecureClient({
        host: url.hostname,
        port: 443,
        path: `${url.pathname}xmlrpc.php`
      });
    } else {
      this.client = createClient({
        host: url.hostname,
        port: 80,
        path: `${url.pathname}xmlrpc.php`
      });
    }
  }

  newPost(): Promise<WordPressClientResult> {
    const leaf = this.workspace.getMostRecentLeaf();
    if (leaf.view instanceof MarkdownView) {
      const title = this.workspace.getActiveFile()?.basename;
      const content = leaf.view.getViewData();
      return new Promise<WordPressClientResult>((resolve, reject) => {
        this.client.methodCall('wp.newPost', [
          0,
          this.settings.userName,
          this.settings.password,
          {
            post_type: 'post',
            post_status: 'draft',
            post_title: title ?? 'A post from Obsidian!',
            post_content: marked.parse(content) ?? '',
          }
        ], (error: Error, value) => {
          console.log('Method response for \'wp.newPost\': ', value, error);
          if (error) {
            new Notice(`[Error] ${error.message}`);
            reject(error);
          } else {
            new Notice('Post published successfully!');
            resolve({
              code: WordPressClientReturnCode.OK,
              data: value
            });
          }
        });
      });
    } else {
      const error = 'There is no editor found. Nothing will be published.';
      console.warn(error);
      return Promise.reject(new Error(error));
    }
  }

}
