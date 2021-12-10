import { App, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';
import { WpRestJetpackClient } from './wp-rest-jetpack-client';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: any; // eslint-disable-line
}

export interface WordPressClient {
  newPost(): Promise<WordPressClientResult>;
}

export function createWordPressClient(
  app: App,
  plugin: WordpressPlugin
): WordPressClient | null {
  const type = plugin.settings.apiType;
  switch (type) {
    case ApiType.XML_RPC:
      return new WpXmlRpcClient(app, plugin);
    case ApiType.RestAPI_Jetpack:
      return new WpRestJetpackClient(app, plugin);
    default:
      // This should not happen!
      new Notice('No approved WordPress API.\nPlease check it in settings.');
      return null;
  }
}
