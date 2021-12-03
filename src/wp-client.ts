import { WordpressPluginSettings } from './settings';
import { Client, createClient, createSecureClient } from 'xmlrpc';
import { WordPressPost } from './wp-types';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: any; // eslint-disable-line
}

export interface WordPressClient {
  newPost(post: WordPressPost): Promise<WordPressClientResult>;
}

export function createWordPressClient(settings: WordpressPluginSettings, type: 'xmlrpc'): WordPressClient {
  switch (type) {
    case 'xmlrpc':
      return new WpXmlRpcClient(settings);
    default:
      return null;
  }
}

class WpXmlRpcClient implements WordPressClient {

  private readonly client: Client;

  constructor(
    private readonly settings: WordpressPluginSettings
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

  newPost(post: WordPressPost): Promise<WordPressClientResult> {
    return new Promise<WordPressClientResult>((resolve, reject) => {
      this.client.methodCall('wp.newPost', [
        0,
        this.settings.userName,
        this.settings.password,
        post
      ], (error, value) => {
        console.log('Method response for \'wp.newPost\': ', value, error);
        if (error) {
          reject(error);
        } else {
          resolve({
            code: WordPressClientReturnCode.OK,
            data: value
          });
        }
      });
    });
  }

}
