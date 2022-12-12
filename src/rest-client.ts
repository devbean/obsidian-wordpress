import { requestUrl } from 'obsidian';

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

  httpGet(
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
    }
    console.log('REST GET', endpoint, opts);
    return requestUrl({
      url: endpoint,
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

  httpPost(
    path: string,
    body: unknown,
    options?: {
      headers: Record<string, string>
    }): Promise<unknown> {
    let realPath = path;
    if (realPath.startsWith('/')) {
      realPath = realPath.substring(1);
    }

    const endpoint = `${this.href}/${realPath}`;
    const opts = {
      headers: {},
      ...options
    }
    console.log('REST POST', endpoint, opts);
    return requestUrl({
      url: endpoint,
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
