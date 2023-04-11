import { App, Notice } from 'obsidian';
import WordpressPlugin from './main';
import {
  WordPressAuthParams,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressPostParams
} from './wp-client';
import { XmlRpcClient } from './xmlrpc-client';
import { AbstractWordPressClient } from './abstract-wp-client';
import { Term } from './wp-api';
import { ERROR_NOTICE_TIMEOUT } from './consts';
import { SafeAny } from './utils';
import { WpProfile } from './wp-profile';

interface FaultResponse {
  faultCode: string;
  faultString: string;
}

function isFaultResponse(response: unknown): response is FaultResponse {
  return (response as FaultResponse).faultCode !== undefined;
}

export class WpXmlRpcClient extends AbstractWordPressClient {

  private readonly client: XmlRpcClient;

  constructor(
    readonly app: App,
    readonly plugin: WordpressPlugin,
    readonly profile: WpProfile
  ) {
    super(app, plugin, profile);
    this.client = new XmlRpcClient({
      url: new URL(profile.endpoint),
      xmlRpcPath: profile.xmlRpcPath
    });
  }

  publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult> {
    const publishContent = {
      post_type: 'post',
      post_status: postParams.status,
      comment_status: postParams.commentStatus,
      post_title: title,
      post_content: content,
      terms: {
        'category': postParams.categories
      },
      terms_names: {
        'post_tag': postParams.tags
      }
    };
    let publishPromise;
    if (postParams.postId) {
      publishPromise = this.client.methodCall('wp.editPost', [
        0,
        certificate.username,
        certificate.password,
        postParams.postId,
        publishContent
      ]);
    } else {
      publishPromise = this.client.methodCall('wp.newPost', [
        0,
        certificate.username,
        certificate.password,
        publishContent
      ]);
    }
    return publishPromise.then(response => {
        if (isFaultResponse(response)) {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: response.faultCode,
              message: response.faultString
            },
            response
          };
        }
        return {
          code: WordPressClientReturnCode.OK,
          data: {
            postId: postParams.postId ?? response,
            categories: postParams.categories
          },
          response
        };
      });
  }

  getCategories(certificate: WordPressAuthParams): Promise<Term[]> {
    return this.client.methodCall('wp.getTerms', [
      0,
      certificate.username,
      certificate.password,
      'category'
    ])
      .then(response => {
        if (isFaultResponse(response)) {
          const fault = `${response.faultCode}: ${response.faultString}`;
          new Notice(fault, ERROR_NOTICE_TIMEOUT);
          throw new Error(fault);
        }
        return response;
      })
      .then((data) => {
        return (data as SafeAny).map((it: SafeAny) => ({
          ...it,
          id: it.term_id
        })) ?? [];
      });
  }

  validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult> {
    return this.client.methodCall('wp.getProfile', [
      0,
      certificate.username,
      certificate.password
    ])
      .then(response => {
        if (isFaultResponse(response)) {
          return {
            code: WordPressClientReturnCode.Error,
            data: `${response.faultCode}: ${response.faultString}`
          };
        } else {
          return {
            code: WordPressClientReturnCode.OK,
            data: response
          };
        }
      });
  }

  getTag(name: string, certificate: WordPressAuthParams): Promise<Term> {
    return Promise.resolve({
      id: name,
      name,
      slug: name,
      taxonomy: 'post_tag',
      description: name,
      count: 0
    });
  }

}
