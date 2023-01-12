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
import { isFunction, isString } from 'lodash-es';

export class WpRestClient extends AbstractWordPressClient {

  private readonly client: RestClient;

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin,
    private readonly context: WpRestClientContext
  ) {
    super(app, plugin);
    this.client = new RestClient({
      url: new URL(getUrl(this.context.endpoints?.base, plugin.settings.endpoint))
    });
  }

  protected openLoginModal(): boolean {
    if (this.context.openLoginModal !== undefined) {
      return this.context.openLoginModal;
    }
    return  super.openLoginModal();
  }

  publish(title: string, content: string, postParams: WordPressPostParams, wp: WordPressAuthParams): Promise<WordPressClientResult> {
    return this.client.httpPost(
      getUrl(this.context.endpoints?.newPost, 'wp-json/wp/v2/posts'),
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
        } else if (resp.id || resp.ID) {
          return {
            code: WordPressClientReturnCode.OK,
            data: resp
          };
        } else {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: 500,
              message: this.plugin.i18n.t('error_cannotParseResponse')
            }
          };
        }
      });
  }

  getCategories(wp: WordPressAuthParams): Promise<Term[]> {
    return this.client.httpGet(
      getUrl(this.context.endpoints?.getCategories, 'wp-json/wp/v2/categories'),
      {
        headers: this.context.getHeaders(wp)
      })
      .then(data => data as Term[] ?? []);
  }

  validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult> {
    return this.client.httpGet(
      getUrl(this.context.endpoints?.validateUser, `wp-json/wp/v2/users?search=xxx`),
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
        console.log(error);
        return {
          code: WordPressClientReturnCode.Error,
          data: this.plugin.i18n.t('error_invalidUser')
        };
      });
  }

}

type UrlGetter = () => string;

function getUrl(url: string | UrlGetter | undefined, defaultValue: string): string {
  if (isString(url)) {
    return url;
  } else if (isFunction(url)) {
    return url();
  } else {
    return defaultValue;
  }
}

interface WpRestClientContext {
  name: string;

  endpoints?: {
    base?: string | UrlGetter;
    newPost?: string | UrlGetter;
    getCategories?: string | UrlGetter;
    validateUser?: string | UrlGetter;
  };

  openLoginModal?: boolean;

  getHeaders(wp: WordPressAuthParams): Record<string, string>;

}

export class WpRestClientMiniOrangeContext implements WpRestClientContext {
  name: 'WpRestClientMiniOrangeContext';

  constructor() {
    console.log('WpRestClientMiniOrangeContext loaded');
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.username}:${wp.password}`).toString('base64')}`
    };
  }
}

export class WpRestClientAppPasswordContext implements WpRestClientContext {
  name: 'WpRestClientAppPasswordContext';

  constructor() {
    console.log('WpRestClientAppPasswordContext loaded');
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.username}:${wp.password}`, 'utf-8').toString('base64')}`
    };
  }
}

export class WpRestClientWpComOAuth2Context implements WpRestClientContext {
  name: 'WpRestClientWpComOAuth2Context';

  openLoginModal = false;

  endpoints = {
    base: 'https://public-api.wordpress.com',
    newPost: () => `/rest/v1/sites/${this.site}/posts/new`,
    getCategories: () => `/rest/v1/sites/${this.site}/categories`,
    validateUser: () => `/rest/v1/sites/${this.site}/posts?number=1`,
  };

  constructor(
    private readonly site: string,
    private readonly accessToken: string
  ) {
    console.log('WpRestClientWpComOAuth2Context loaded');
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `BEARER ${this.accessToken}`
    };
  }
}
