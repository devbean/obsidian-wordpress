import { App, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';
import {
  WpRestClient,
  WpRestClientAppPasswordContext,
  WpRestClientMiniOrangeContext,
  WpRestClientWpComOAuth2Context
} from './wp-rest-client';
import { WordPressClient } from './wp-client';
import { ERROR_NOTICE_TIMEOUT } from './consts';

export function getWordPressClient(
  app: App,
  plugin: WordpressPlugin
): WordPressClient | null {
  if (!plugin.settings.endpoint || plugin.settings.endpoint.length === 0) {
    new Notice(plugin.i18n.t('error_noEndpoint'), ERROR_NOTICE_TIMEOUT);
    return null;
  }
  let client: WordPressClient | null = null;
  switch (plugin.settings.apiType) {
    case ApiType.XML_RPC:
      client = new WpXmlRpcClient(app, plugin);
      break;
    case ApiType.RestAPI_miniOrange:
      client = new WpRestClient(app, plugin, new WpRestClientMiniOrangeContext());
      break;
    case ApiType.RestApi_ApplicationPasswords:
      client = new WpRestClient(app, plugin, new WpRestClientAppPasswordContext());
      break;
    case ApiType.RestApi_WpComOAuth2:
      if (plugin.settings.wpComOAuth2Token) {
        client = new WpRestClient(app, plugin, new WpRestClientWpComOAuth2Context(
          plugin.settings.wpComOAuth2Token.blogId,
          plugin.settings.wpComOAuth2Token.accessToken
        ));
      }
      break;
    default:
      client = null;
      break;
  }
  return client;
}
