import { App } from 'obsidian';
import WordpressPlugin from './main';
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
  type: 'xmlrpc'
): WordPressClient {
  switch (type) {
    case 'xmlrpc':
      return new WpXmlRpcClient(app, plugin);
    default:
      return null;
  }
}
