import { App } from 'obsidian';
import WordpressPlugin from './main';
import { ApiType } from './settings';
import { WpXmlRpcClient } from './wp-xml-rpc-client';
import { WpRestClient, WpRestClientMiniOrangeContext } from './wp-rest-client';
import { WordPressClient } from './wp-client';


const wpClientsCache = new Map<ApiType, WordPressClient>();

export function getWordPressClient(
  app: App,
  plugin: WordpressPlugin
): WordPressClient | null {
  const cached = wpClientsCache.get(plugin.settings.apiType);
  if (cached) {
    return cached;
  } else {
    let newClient: WordPressClient | null;
    switch (plugin.settings.apiType) {
      case ApiType.XML_RPC:
        newClient = new WpXmlRpcClient(app, plugin);
        break;
      case ApiType.RestAPI_miniOrange:
        newClient = new WpRestClient(app, plugin, new WpRestClientMiniOrangeContext());
        break;
      default:
        newClient = null;
        break;
    }
    if (newClient) {
      wpClientsCache.set(plugin.settings.apiType, newClient);
    }
    return newClient;
  }
}
