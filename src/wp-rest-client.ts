import { App, requestUrl } from 'obsidian';
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
    username: string,
    password: string
  }): Promise<WordPressClientResult> {
    return this.httpPost(
      'wp-json/wp/v2/posts',
      {
        title,
        content,
        status: postParams.status,
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

  getCategories(wp: { username: string; password: string }): Promise<Term[]> {
    return this.httpGet(
      'wp-json/wp/v2/categories',
      {
        headers: this.context.getHeaders(wp)
      })
      .then(data => data as Term[] ?? []);
  }

  protected httpGet(
    path: string,
    options?: {
      headers: Record<string, string>
    }
  ): Promise<unknown> {
    const opts = {
      headers: {},
      ...options
    }
    console.log('REST GET', `${this.options.url.toString()}${path}`, opts);
    return requestUrl({
      url: `${this.options.url.toString()}${path}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'obsidian.md',
        ...opts.headers
      }
    })
      .then(response => {
        console.log('GET response', response);
        return response.json;
      });
  }

  protected httpPost(
    path: string,
    body: unknown,
    options?: {
      headers: Record<string, string>
    }): Promise<unknown> {
    const opts = {
      headers: {},
      ...options
    }
    console.log('REST POST', `${this.options.url.toString()}${path}`, opts);
    return requestUrl({
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
        console.log('POST response', response);
        return response.json;
      });
  }

}

interface WpRestClientContext {
  name: string;

  getHeaders(wp: { username: string, password: string }): Record<string, string>;
}

export class WpRestClientMiniOrangeContext implements WpRestClientContext {
  name: 'WpRestClientMiniOrangeContext';

  getHeaders(wp: { username: string, password: string }): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.username}:${wp.password}`).toString('base64')}`
    }
  }
}
