import {App, Notice} from 'obsidian';
import WordpressPlugin from './main';
import {WordPressAuthParams, WordPressClientResult, WordPressClientReturnCode, WordPressPostParams} from './wp-client';
import {XmlRpcClient} from './xmlrpc-client';
import {AbstractWordPressClient} from './abstract-wp-client';
import {Term} from './wp-api';

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
    return this.client.methodCall('wp.newPost', [
      0,
      wp.username,
      wp.password,
      {
        post_type: 'post',
        post_status: postParams.status,
        post_title: title,
        post_content: content,
        terms: {
          'category': postParams.categories
        }
      }
    ])
      .then(response => {
        if (isFaultResponse(response)) {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: response.faultCode,
              message: response.faultString
            }
          };
        }
        return {
          code: WordPressClientReturnCode.OK,
          data: response
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
          new Notice(fault);
          throw new Error(fault);
        }
        return response;
      })
      .then((data: unknown[]) => {
        return data.map((it: any) => ({
          ...it,
          id: it.term_id
        })) ?? [];
      });
  }

  checkUser(certificate: WordPressAuthParams): Promise<WordPressClientResult> {
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
