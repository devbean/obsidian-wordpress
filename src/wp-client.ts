import { WordpressPluginSettings } from './settings';
import { Client, createClient, createSecureClient } from 'xmlrpc';

export interface WordPressClient {
  publish(): Promise<boolean>;
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
    console.debug(url);
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
    this.client.methodCall('demo.sayHello', [ this.settings.userName, this.settings.password ],  (error, value) => {
      // Results of the method response
      console.log('Method response for \'wp.getPost\': ', value, error);
    });
  }

  publish(): Promise<boolean> {
    return Promise.resolve(false);
  }

}
