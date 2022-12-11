import {requestUrl} from "obsidian";

interface RestOptions {
  url: URL;
}

export class RestClient {

  constructor(
    private readonly options: RestOptions
  ) {
    console.log(options);
  }

  httpGet(
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

  httpPost(
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
