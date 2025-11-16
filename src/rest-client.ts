import { request } from 'obsidian';
import { getBoundary, SafeAny } from './utils';
import { FormItemNameMapper, FormItems, RestClientOptions } from './types';
import { Logger } from './logger';

export class RestClient {

  /**
   * Href without '/' at the very end.
   * @private
   */
  private readonly href: string;

  constructor(
    private readonly options: RestClientOptions
  ) {
    Logger.log('RestClient', options);

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
    Logger.log('RestClient httpGet', { endpoint, opts });
    const response = await request({
      url: endpoint,
      method: 'GET',
      headers: {
        'User-Agent': 'obsidian.md',
        ...opts.headers
      }
    });
    return JSON.parse(response);
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
      predefinedHeaders['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
    } else if (body instanceof ArrayBuffer) {
      requestBody = body;
    } else {
      requestBody = JSON.stringify(body);
      predefinedHeaders['Content-Type'] = 'application/json';
    }
    const headers = {
      'User-Agent': 'obsidian.md',
      ...predefinedHeaders,
      ...options.headers
    };
    Logger.log('RestClient httpPost', { endpoint, body, headers });
    const response = await request({
      url: endpoint,
      method: 'POST',
      headers,
      body: requestBody
    });
    return JSON.parse(response);
  }

}
