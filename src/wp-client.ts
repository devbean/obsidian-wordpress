import { Client, createClient, createSecureClient } from 'xmlrpc';
import { App, MarkdownView, Modal, Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { marked } from 'marked';

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
): WordPressClient {
  switch (type) {
    case ApiType.XML_RPC:
      return new WpXmlRpcClient(app, plugin);
    default:
      return null;
  }
}
