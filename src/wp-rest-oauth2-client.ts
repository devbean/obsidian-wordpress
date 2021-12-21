import { WordPressClient, WordPressClientResult, WordPressClientReturnCode } from './wp-client';
import { Client } from 'xmlrpc';
import { App, MarkdownView } from 'obsidian';
import WordpressPlugin from './main';
import axios from 'axios';

export class WpRestOAuth2Client implements WordPressClient {

  private readonly client: Client;

  constructor(
    private readonly app: App,
    private readonly plugin: WordpressPlugin
  ) {
    const url = new URL(plugin.settings.endpoint);
    console.log(url);
  }

  newPost(): Promise<WordPressClientResult> {
    return new Promise( (resolve, reject) => {
      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        // const endpoint = 'https://public-api.wordpress.com/rest/v1/sites/devbean.great-site.net/posts/';
        // const wp = new WPAPI({ endpoint });
        // wp.posts().then(function( data ) {
        //   console.log(data);
        // }).catch(function( err ) {
        //   console.log(err);
        // });
        // const wpAuth = new ClientOAuth2({
        //   clientId: 'o7po3eDmTI7dRU6vDYp5idKZUAniVLPjiHw0RLGM',
        //   clientSecret: 'fkBqTgQOyVXFnST0qgSNsFiC6jxmTl0GKuKL0H3R',
        //   accessTokenUri: 'https://blog.galaxyworld.org/oauth/token',
        //   authorizationUri: 'https://blog.galaxyworld.org/oauth/authorize',
        //   scopes: [ 'basic' ]
        // });
        // wpAuth.token.getToken()
        axios.get('https://blog.galaxyworld.org/oauth/authorize', {
          params: {
            client_id: 'o7po3eDmTI7dRU6vDYp5idKZUAniVLPjiHw0RLGM',
            response_type: 'code',
            scope: 'basic',
            redirect_uri: 'app://obsidian.md'
          }
        })
          .then(response => {
            console.log('>>>>>>>>>>', response);
          })
          .catch(error => {
            console.log('ERROR>>>>>>>>>>', error);
          });
        // fetch('https://blog.galaxyworld.org/oauth/authorize')
        //   .then(response => {
        //
        //   });
        // const data = await response.json();
        // console.log(data);

        // got.post('https://blog.galaxyworld.org/oauth/authorize', {
        //   searchParams: {
        //     client_id: 'o7po3eDmTI7dRU6vDYp5idKZUAniVLPjiHw0RLGM',
        //     response_type: 'code',
        //     scope: 'basic'
        //   }
        // })
        //   .json()
        //   .then(response => {
        //     console.log(response);
        //   })
        //   .catch(err => {
        //     console.log(err);
        //   });

        resolve({
          code: WordPressClientReturnCode.OK,
          data: ''
        });
      } else {
        const error = 'There is no editor found. Nothing will be published.';
        console.warn(error);
        reject(new Error(error));
      }
    });
  }

}
