import { App } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressClientResult, WordPressClientReturnCode } from './wp-client';
import { XmlRpcClient } from './xmlrpc-client';
import { AbstractWordPressClient } from './abstract-wp-client';

export class WpXmlRpcClient extends AbstractWordPressClient {

  private readonly client: XmlRpcClient;

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin
  ) {
    super(app, plugin);
    this.client = new XmlRpcClient({
      url: new URL(plugin.settings.endpoint)
    });
  }

  publish(title: string, content: string, wp: { userName: string, password: string }): Promise<WordPressClientResult> {
    return this.client.methodCall('wp.newPost', [
      0,
      wp.userName,
      wp.password,
      {
        post_type: 'post',
        post_status: 'draft',
        post_title: title,
        post_content: content,
      }
    ])
      .then((response: any) => { // eslint-disable-line
        if (response.faultCode && response.faultString) {
          // it means error happens
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: response.faultCode,
              message: response.faultString
            }
          };
        } else {
          return {
            code: WordPressClientReturnCode.OK,
            data: response
          }
        }
      });
  }

}
