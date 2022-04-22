import { App, request } from 'obsidian';
import { WordPressClientResult, WordPressClientReturnCode, WordPressPostParams } from './wp-client';
import { AbstractWordPressClient } from './abstract-wp-client';
import WordpressPlugin from './main';
import { Term } from './wp-api';

interface RestOptions {
  url: URL;
}

export class WpRestClient extends AbstractWordPressClient {

  private readonly options: RestOptions;

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin,
    private readonly context: WpRestClientContext
  ) {
    super(app, plugin);
    this.options = {
      url: new URL(plugin.settings.endpoint)
    };
  }

  publish(title: string, content: string, postParams: WordPressPostParams, wp: {
    userName: string,
    password: string
  }): Promise<WordPressClientResult> {
    return this.httpPost(
      'wp-json/wp/v2/posts',
      {
        title,
        content,
        status: postParams.status
      },
      {
        headers: this.context.getHeaders(wp)
      });
  }

  getCategories(wp: { userName: string; password: string }): Promise<Term[]> {
    return Promise.resolve([]);
  }

  protected httpPost(
    path: string,
    body: unknown,
    options?: {
      headers: Record<string, string>
    }): Promise<WordPressClientResult> {
    const opts = {
      headers: {},
      ...options
    }
    console.log('REST POST', `${this.options.url.toString()}${path}`, opts);
    return request({
      url: `${this.options.url.toString()}${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'obsidian.md',
        ...opts.headers
      },
      body: JSON.stringify(body)
    })
      .then(response => {
        console.log('WpRestClient.post response', response);
        try {
          const resp = JSON.parse(response);
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
          }
        } catch (e) {
          console.log('WpRestClient.post', e);
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

}

interface WpRestClientContext {
  name: string;

  getHeaders(wp: { userName: string, password: string }): Record<string, string>;
}

export class WpRestClientMiniOrangeContext implements WpRestClientContext {
  name: 'WpRestClientMiniOrangeContext';

  getHeaders(wp: { userName: string, password: string }): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.userName}:${wp.password}`).toString('base64')}`
    }
  }
}
