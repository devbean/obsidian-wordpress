import { App, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';
import { WpRestClient, WpRestClientAppPasswordContext, WpRestClientMiniOrangeContext } from './wp-rest-client';
import { WordPressClient } from './wp-client';

export function getWordPressClient(
  app: App,
  plugin: WordpressPlugin
): WordPressClient | null {
  if (!plugin.settings.endpoint || plugin.settings.endpoint.length === 0) {
    new Notice(plugin.i18n.t('error_noEndpoint'));
    return null;
  }
  let client: WordPressClient | null;
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
    default:
      client = null;
      break;
  }
  return client;
}
