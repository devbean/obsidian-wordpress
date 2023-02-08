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
import { isFunction, isString, template } from 'lodash-es';


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

  publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult> {
    let url: string;
    if (postParams.postId) {
      url = getUrl(this.context.endpoints?.editPost, 'wp-json/wp/v2/posts/<%= postId %>', {
        postId: postParams.postId
      });
    } else {
      url = getUrl(this.context.endpoints?.newPost, 'wp-json/wp/v2/posts');
    }
    return this.client.httpPost(
      url,
      {
        title,
        content,
        status: postParams.status,
        comment_status: postParams.commentStatus,
        categories: postParams.categories,
        tags: postParams.tags ?? []
      },
      {
        headers: this.context.getHeaders(certificate)
      })
      .then((resp: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.log('WpRestClient response', resp);
        if (resp.code && resp.message) {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: resp.code,
              message: resp.message
            },
            response: resp
          };
        } else if (resp.id || resp.ID) {
          return {
            code: WordPressClientReturnCode.OK,
            data: {
              postId: postParams.postId ?? (resp.id ?? resp.ID)
            },
            response: resp
          };
        } else {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: 500,
              message: this.plugin.i18n.t('error_cannotParseResponse')
            },
            response: resp
          };
        }
      });
  }

  getCategories(certificate: WordPressAuthParams): Promise<Term[]> {
    return this.client.httpGet(
      getUrl(this.context.endpoints?.getCategories, 'wp-json/wp/v2/categories'),
      {
        headers: this.context.getHeaders(certificate)
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
          data: data,
          response: data
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

  async getTag(name: string, certificate: WordPressAuthParams): Promise<Term> {
    const exists: Term[] = await this.client.httpGet(
      getUrl(this.context.endpoints?.getTag, 'wp-json/wp/v2/tags?number=1&search=<%= name %>', {
        name
      }),
    )
      .then((resp: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.log('WpRestClient getTags response', resp);
        return resp as Term[] ?? [];
      });
    if (exists.length === 0) {
      return await this.client.httpPost(
        getUrl(this.context.endpoints?.newTag, 'wp-json/wp/v2/tags'),
        {
          name
        },
        {
          headers: this.context.getHeaders(certificate)
        })
        .then((resp: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          console.log('WpRestClient newTag response', resp);
          return resp;
        });
    } else {
      return exists[0];
    }
  }

}

type UrlGetter = () => string;

function getUrl(
  url: string | UrlGetter | undefined,
  defaultValue: string,
  params?: { [p: string]: string }
): string {
  let resultUrl: string;
  if (isString(url)) {
    resultUrl = url;
  } else if (isFunction(url)) {
    resultUrl = url();
  } else {
    resultUrl = defaultValue;
  }
  if (params) {
    const compiled = template(resultUrl);
    return compiled(params);
  } else {
    return resultUrl;
  }
}

interface WpRestClientContext {
  name: string;

  endpoints?: {
    base?: string | UrlGetter;
    newPost?: string | UrlGetter;
    editPost?: string | UrlGetter;
    getCategories?: string | UrlGetter;
    newTag?: string | UrlGetter;
    getTag?: string | UrlGetter;
    validateUser?: string | UrlGetter;
  };

  openLoginModal?: boolean;

  getHeaders(wp: WordPressAuthParams): Record<string, string>;


}

export class WpRestClientMiniOrangeContext implements WpRestClientContext {
  name = 'WpRestClientMiniOrangeContext';

  constructor() {
    console.log(`${this.name} loaded`);
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.username}:${wp.password}`).toString('base64')}`
    };
  }
}

export class WpRestClientAppPasswordContext implements WpRestClientContext {
  name = 'WpRestClientAppPasswordContext';

  constructor() {
    console.log(`${this.name} loaded`);
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `Basic ${Buffer.from(`${wp.username}:${wp.password}`, 'utf-8').toString('base64')}`
    };
  }
}

export class WpRestClientWpComOAuth2Context implements WpRestClientContext {
  name = 'WpRestClientWpComOAuth2Context';

  openLoginModal = false;

  endpoints = {
    base: 'https://public-api.wordpress.com',
    newPost: () => `/rest/v1/sites/${this.site}/posts/new`,
    editPost: () => `/rest/v1/sites/${this.site}/posts/<%= postId %>`,
    getCategories: () => `/rest/v1/sites/${this.site}/categories`,
    newTag: () => `/rest/v1/sites/${this.site}/tags/new`,
    getTag: () => `/rest/v1/sites/${this.site}/tags?number=1&search=<%= name %>`,
    validateUser: () => `/rest/v1/sites/${this.site}/posts?number=1`,
  };

  constructor(
    private readonly site: string,
    private readonly accessToken: string
  ) {
    console.log(`${this.name} loaded`);
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'Authorization': `BEARER ${this.accessToken}`
    };
  }
}
