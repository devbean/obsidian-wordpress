import { App } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType, RestApiPlugin } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';
import { WpRestMiniOrangeClient } from './wp-rest-miniOrange-client';
import { PostStatus } from './wp-api';

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
  newPost(params: WordPressPostParams): Promise<WordPressClientResult>;
}

export function createWordPressClient(
  app: App,
  plugin: WordpressPlugin,
  type: ApiType,
  options?: {
    restPlugin: RestApiPlugin
  }
): WordPressClient | null {
  switch (type) {
    case ApiType.XML_RPC:
      return new WpXmlRpcClient(app, plugin);
    case ApiType.RestAPI:
      switch (options?.restPlugin) {
        case RestApiPlugin.Authentication_miniOrange:
          return new WpRestMiniOrangeClient(app, plugin);
      }
      return null;
    default:
      return null;
  }
}
