import { App } from 'obsidian';
import {
  WordPressAuthParams,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressPostParams
} from './wp-client';
import { AbstractWordPressClient } from './abstract-wp-client';
import WordpressPlugin from './main';
import { Term } from './wp-api';
import { RestClient } from './rest-client';

export class WpRestClient extends AbstractWordPressClient {

  private readonly client: RestClient;

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin,
    private readonly context: WpRestClientContext
  ) {
    super(app, plugin);
    this.client = new RestClient({
      url: new URL(plugin.settings.endpoint)
    });
  }

  publish(title: string, content: string, postParams: WordPressPostParams, wp: WordPressAuthParams): Promise<WordPressClientResult> {
    return this.client.httpPost(
      'wp-json/wp/v2/posts',
      {
        title,
        content,
        status: postParams.status,
        comment_status: postParams.commentStatus,
        categories: postParams.categories
      },
      {
        headers: this.context.getHeaders(wp)
      })
      .then((resp: any) => {
        console.log('WpRestClient response', resp);
        if (resp.code && resp.message) {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: resp.code,
              message: resp.message
            }
          };
        } else if (resp.id) {
          return {
            code: WordPressClientReturnCode.OK,
            data: resp
          };
        } else {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: 500,
              message: 'Cannot parse WordPress REST API response.'
            }
          };
        }
      });
  }

  getCategories(wp: WordPressAuthParams): Promise<Term[]> {
    return this.client.httpGet(
      'wp-json/wp/v2/categories',
      {
        headers: this.context.getHeaders(wp)
      })
      .then(data => data as Term[] ?? []);
  }

  checkUser(certificate: WordPressAuthParams): Promise<WordPressClientResult> {
    return this.client.httpGet(
      `wp-json/wp/v2/users/?username=${certificate.username}`,
      {
        headers: this.context.getHeaders(certificate)
      })
      .then(data => {
        return {
          code: WordPressClientReturnCode.OK,
          data: data
        };
      })
      .catch(error => {
        return {
          code: WordPressClientReturnCode.Error,
          data: this.plugin.i18n.t('error_invalidUser')
        };
      });
  }

}

interface WpRestClientContext {
  name: string;

  getHeaders(wp: WordPressAuthParams): Record<string, string>;
}

export class WpRestClientMiniOrangeContext implements WpRestClientContext {
  name: 'WpRestClientMiniOrangeContext';

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.username}:${wp.password}`).toString('base64')}`
    }
  }
}
