import { request } from 'obsidian';
import { WordPressClientResult, WordPressClientReturnCode } from './wp-client';

interface RestOptions {
  url: URL;
}

export class WpRestClient {

  constructor(
    private readonly options: RestOptions
  ) {
    console.log(options);
  }

  post(body: unknown, options?: {
    headers: Record<string, string>
  }): Promise<WordPressClientResult> {
    const opts = {
      headers: {},
      ...options
    };
    return request({
      url: this.options.url.toString(),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'obsidian.md',
        ...opts.headers
      },
      body: JSON.stringify(body)
    })
      .then(response => {
        try {
          const resp = JSON.parse(response);
          if (resp.code && resp.message) {
            return {
              code: WordPressClientReturnCode.Error,
              data: {
                code: resp.code,
                message: resp.message
              }
            };
          } else if (resp.id) {
            return {
              code: WordPressClientReturnCode.OK,
              data: resp
            };
          }
        } catch (e) {
          return {
            code: WordPressClientReturnCode.Error,
            data: {
              code: 500,
              message: 'Cannot parse WordPress REST API response.'
            }
          };
        }
      });
  }

}
