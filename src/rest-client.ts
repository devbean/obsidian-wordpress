import { requestUrl } from 'obsidian';
import { getBoundary, SafeAny } from './utils';
import { FormItemNameMapper, FormItems } from './types';

interface RestOptions {
  url: URL;
}

export class RestClient {

  /**
   * Href without '/' at the very end.
   * @private
   */
  private readonly href: string;

  constructor(
    private readonly options: RestOptions
  ) {
    console.log(options);

    this.href = this.options.url.href;
    if (this.href.endsWith('/')) {
      this.href = this.href.substring(0, this.href.length - 1);
    }
  }

  async httpGet(
    path: string,
    options?: {
      headers: Record<string, string>
    }
  ): Promise<unknown> {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const opts = {
      headers: {},
      ...options
    };
    console.log('REST GET', endpoint, opts);
    const response = await requestUrl({
      url: endpoint,
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'obsidian.md',
        ...opts.headers
      }
    });
    console.log('GET response', response);
    return response.json;
  }

  async httpPost(
    path: string,
    body: SafeAny,
    options: {
      headers?: Record<string, string>;
      formItemNameMapper?: FormItemNameMapper;
    }): Promise<unknown> {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const predefinedHeaders: Record<string, string> = {};
    let requestBody: SafeAny;
    if (body instanceof FormItems) {
      const boundary = getBoundary();
      requestBody = await body.toArrayBuffer({
        boundary,
        nameMapper: options.formItemNameMapper
      });
      predefinedHeaders['content-type'] = `multipart/form-data; boundary=${boundary}`;
    } else if (body instanceof ArrayBuffer) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      predefinedHeaders['content-type'] = 'application/json';
    }
    const response = await requestUrl({
      url: endpoint,
      method: 'POST',
      headers: {
        'user-agent': 'obsidian.md',
        ...predefinedHeaders,
        ...options.headers
      },
      body: requestBody
    });
    console.log('POST response', response);
    return response.json;
  }

}
