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
    readonly plugin: WordpressPlugin
  ) {
    super(app, plugin);
    this.client = new XmlRpcClient({
      url: new URL(plugin.settings.endpoint),
      xmlRpcPath: plugin.settings.xmlRpcPath
    });
  }

  publish(title: string, content: string, postParams: WordPressPostParams, wp: WordPressAuthParams): Promise<WordPressClientResult> {
    const publishContent = {
      post_type: 'post',
      post_status: postParams.status,
      comment_status: postParams.commentStatus,
      post_title: title,
      post_content: content,
      terms: {
        'category': postParams.categories
      }
    };
    let publishPromise;
    if (postParams.postId) {
      publishPromise = this.client.methodCall('wp.editPost', [
        0,
        wp.username,
        wp.password,
        postParams.postId,
        publishContent
      ]);
    } else {
      publishPromise = this.client.methodCall('wp.newPost', [
        0,
        wp.username,
        wp.password,
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
            postId: postParams.postId ?? response
          },
          response
        };
      });
  }

  getCategories(wp: WordPressAuthParams): Promise<Term[]> {
    return this.client.methodCall('wp.getTerms', [
      0,
      wp.username,
      wp.password,
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
      .then((data: unknown[]) => {
        return data.map((it: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
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

}
