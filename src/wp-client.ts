import { App } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType, RestApiPlugin } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';
import { PostStatus } from './wp-api';
import { WpRestClient, WpRestClientMiniOrangeContext } from './wp-rest-client';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: unknown;
}

export interface WordPressPostParams {
  status: PostStatus;
}

export interface WordPressClient {

  /**
   * Creates a new post to WordPress.
   *
   * @param defaultPostParams Use this parameter instead of popup publish modal if this is not undefined.
   */
  newPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult>;
}

export function createWordPressClient(
  app: App,
  plugin: WordpressPlugin
): WordPressClient | null {
  switch (plugin.settings.apiType) {
    case ApiType.XML_RPC:
      return new WpXmlRpcClient(app, plugin);
    case ApiType.RestAPI:
      switch (plugin.settings.restApiPlugin) {
        case RestApiPlugin.Authentication_miniOrange:
          return new WpRestClient(app, plugin, new WpRestClientMiniOrangeContext());
      }
      return null;
    default:
      return null;
  }
}
