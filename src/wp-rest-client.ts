import {
  WordPressAuthParams,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressMediaUploadResult,
  WordPressPostParams,
  WordPressPublishResult
} from './wp-client';
import { AbstractWordPressClient } from './abstract-wp-client';
import WordpressPlugin from './main';
import { Term } from './wp-api';
import { RestClient } from './rest-client';
import { isArray, isFunction, isNumber, isString, template } from 'lodash-es';
import { SafeAny } from './utils';
import { WpProfile } from './wp-profile';
import { FormItemNameMapper, FormItems, Media } from './types';


export class WpRestClient extends AbstractWordPressClient {

  private readonly client: RestClient;

  constructor(
    readonly plugin: WordpressPlugin,
    readonly profile: WpProfile,
    private readonly context: WpRestClientContext
  ) {
    super(plugin, profile);
    this.name = 'WpRestClient';
    this.client = new RestClient({
      url: new URL(getUrl(this.context.endpoints?.base, profile.endpoint))
    });
  }

  protected openLoginModal(): boolean {
    if (this.context.openLoginModal !== undefined) {
      return this.context.openLoginModal;
    }
    return  super.openLoginModal();
  }

  async publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressPublishResult>> {
    let url: string;
    if (postParams.postId) {
      url = getUrl(this.context.endpoints?.editPost, 'wp-json/wp/v2/posts/<%= postId %>', {
        postId: postParams.postId
      });
    } else {
      url = getUrl(this.context.endpoints?.newPost, 'wp-json/wp/v2/posts');
    }
    const resp: SafeAny = await this.client.httpPost(
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
      });
    console.log('WpRestClient response', resp);
    try {
      const result = this.context.responseParser.toWordPressPublishResult(postParams, resp);
      return {
        code: WordPressClientReturnCode.OK,
        data: result,
        response: resp
      };
    } catch (e) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.ServerInternalError,
          message: this.plugin.i18n.t('error_cannotParseResponse')
        },
        response: resp
      };
    }
    if (resp.id || resp.ID) {
      return {
        code: WordPressClientReturnCode.OK,
        data: {
          postId: postParams.postId ?? (resp.id ?? resp.ID),
          categories: postParams.categories ?? resp.categories
        },
        response: resp
      };
    } else {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.ServerInternalError,
          message: this.plugin.i18n.t('error_cannotParseResponse')
        },
        response: resp
      };
    }
  }

  async getCategories(certificate: WordPressAuthParams): Promise<Term[]> {
    const data = await this.client.httpGet(
      getUrl(this.context.endpoints?.getCategories, 'wp-json/wp/v2/categories'),
      {
        headers: this.context.getHeaders(certificate)
      });
    return this.context.responseParser.toTerms(data);
  }

  async validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult<boolean>> {
    try {
      const data = await this.client.httpGet(
        getUrl(this.context.endpoints?.validateUser, `wp-json/wp/v2/users?search=xxx`),
        {
          headers: this.context.getHeaders(certificate)
        });
      return {
        code: WordPressClientReturnCode.OK,
        data: !!data,
        response: data
      };
    } catch(error) {
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.Error,
          message: this.plugin.i18n.t('error_invalidUser'),
        },
        response: error
      };
    }
  }

  async getTag(name: string, certificate: WordPressAuthParams): Promise<Term> {
    const termResp: SafeAny = await this.client.httpGet(
      getUrl(this.context.endpoints?.getTag, 'wp-json/wp/v2/tags?number=1&search=<%= name %>', {
        name
      }),
    );
    const exists = this.context.responseParser.toTerms(termResp);
    if (exists.length === 0) {
      const resp = await this.client.httpPost(
        getUrl(this.context.endpoints?.newTag, 'wp-json/wp/v2/tags'),
        {
          name
        },
        {
          headers: this.context.getHeaders(certificate)
        });
      console.log('WpRestClient newTag response', resp);
      return this.context.responseParser.toTerm(resp);
    } else {
      return exists[0];
    }
  }

  async uploadMedia(media: Media, certificate: WordPressAuthParams): Promise<WordPressClientResult<WordPressMediaUploadResult>> {
    try {
      const formItems = new FormItems();
      formItems.append('file', media);

      const response: SafeAny = await this.client.httpPost(
        getUrl(this.context.endpoints?.uploadFile, 'wp-json/wp/v2/media'),
        formItems,
        {
          headers: {
            ...this.context.getHeaders(certificate)
          },
          formItemNameMapper: this.context.formItemNameMapper
        });
      const result = this.context.responseParser.toWordPressMediaUploadResult(response);
      return {
        code: WordPressClientReturnCode.OK,
        data: result,
        response
      };
    } catch (e: SafeAny) {
      console.error('uploadMedia', e);
      return {
        code: WordPressClientReturnCode.Error,
        error: {
          code: WordPressClientReturnCode.ServerInternalError,
          message: e.toString()
        },
        response: undefined
      };
    }
  }

}

type UrlGetter = () => string;

function getUrl(
  url: string | UrlGetter | undefined,
  defaultValue: string,
  params?: { [p: string]: string | number }
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

  responseParser: {
    toWordPressPublishResult: (postParams: WordPressPostParams, response: SafeAny) => WordPressPublishResult;
    /**
     * Convert response to `WordPressMediaUploadResult`.
     *
     * If there is any error, throw new error directly.
     * @param response response from remote server
     */
    toWordPressMediaUploadResult: (response: SafeAny) => WordPressMediaUploadResult;
    toTerms: (response: SafeAny) => Term[];
    toTerm: (response: SafeAny) => Term;
  };

  endpoints?: Partial<{
    base: string | UrlGetter;
    newPost: string | UrlGetter;
    editPost: string | UrlGetter;
    getCategories: string | UrlGetter;
    newTag: string | UrlGetter;
    getTag: string | UrlGetter;
    validateUser: string | UrlGetter;
    uploadFile: string | UrlGetter;
  }>;

  openLoginModal?: boolean;

  formItemNameMapper?: FormItemNameMapper;

  getHeaders(wp: WordPressAuthParams): Record<string, string>;

}

class WpRestClientCommonContext implements WpRestClientContext {
  name = 'WpRestClientCommonContext';

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'authorization': `Basic ${btoa(`${wp.username}:${wp.password}`)}`
    };
  }

  responseParser = {
    toWordPressPublishResult: (postParams: WordPressPostParams, response: SafeAny): WordPressPublishResult => {
      if (response.id) {
        return {
          postId: postParams.postId ?? response.id,
          categories: postParams.categories ?? response.categories
        }
      }
      throw new Error('xx');
    },
    toWordPressMediaUploadResult: (response: SafeAny): WordPressMediaUploadResult => {
      return {
        url: response.source_url
      };
    },
    toTerms: (response: SafeAny): Term[] => {
      if (isArray(response)) {
        return response as Term[];
      }
      return [];
    },
    toTerm: (response: SafeAny): Term => ({
      ...response,
      id: response.id
    })
  };
}

export class WpRestClientMiniOrangeContext extends WpRestClientCommonContext {
  name = 'WpRestClientMiniOrangeContext';

  constructor() {
    super();
    console.log(`${this.name} loaded`);
  }
}

export class WpRestClientAppPasswordContext extends WpRestClientCommonContext {
  name = 'WpRestClientAppPasswordContext';

  constructor() {
    super();
    console.log(`${this.name} loaded`);
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
    uploadFile: () => `/rest/v1/sites/${this.site}/media/new`
  };

  constructor(
    private readonly site: string,
    private readonly accessToken: string
  ) {
    console.log(`${this.name} loaded`);
  }

  formItemNameMapper(name: string, isArray: boolean): string {
    if (name === 'file' && !isArray) {
      return 'media[]';
    }
    return name;
  }

  getHeaders(wp: WordPressAuthParams): Record<string, string> {
    return {
      'authorization': `BEARER ${this.accessToken}`
    };
  }

  responseParser = {
    toWordPressPublishResult: (postParams: WordPressPostParams, response: SafeAny): WordPressPublishResult => {
      if (response.ID) {
        return {
          postId: postParams.postId ?? response.ID,
          categories: postParams.categories ?? Object.values(response.categories).map((cat: SafeAny) => cat.ID)
        };
      }
      throw new Error('xx');
    },
    toWordPressMediaUploadResult: (response: SafeAny): WordPressMediaUploadResult => {
      if (response.media.length > 0) {
        const media = response.media[0];
        return {
          url: media.link
        };
      } else if (response.errors) {
        throw new Error(response.errors.error.message);
      }
      throw new Error('Upload failed');
    },
    toTerms: (response: SafeAny): Term[] => {
      if (isNumber(response.found)) {
        return response
          .categories
          .map((it: Term & { ID: number; }) => ({
            ...it,
            id: String(it.ID)
          }));
      }
      return [];
    },
    toTerm: (response: SafeAny): Term => ({
      ...response,
      id: response.ID
    })
  };
}
