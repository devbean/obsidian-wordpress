import { App } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: unknown;
}

export interface WordPressClient {
  newPost(): Promise<WordPressClientResult>;
}

export function createWordPressClient(
  app: App,
  plugin: WordpressPlugin,
  type: ApiType
): WordPressClient | null {
  switch (type) {
    case ApiType.XML_RPC:
      return new WpXmlRpcClient(app, plugin);
    default:
      return null;
  }
}
