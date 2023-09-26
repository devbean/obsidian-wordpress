import { Notice, Setting } from 'obsidian';
import { WpProfile } from './wp-profile';
import { AppState } from './app-state';
import { WordpressPluginSettings } from './plugin-settings';
import MarkdownItMathJax3Plugin from './markdown-it-mathjax3-plugin';
import { WordPressPostParams } from './wp-client';
import { getWordPressClient } from './wp-clients';
import WordpressPlugin from './main';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from './consts';

export type SafeAny = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function openWithBrowser(url: string, queryParams: Record<string, undefined|number|string> = {}): void {
  window.open(`${url}?${generateQueryString(queryParams)}`);
}

export function generateQueryString(params: Record<string, undefined|number|string>): string {
  return new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter( ([k, v]) => v!==undefined)
    ) as Record<string, string>
  ).toString();
}

export function isPromiseFulfilledResult<T>(obj: SafeAny): obj is PromiseFulfilledResult<T> {
  return !!obj && obj.status === 'fulfilled' && obj.value;
}

export function setupMarkdownParser(settings: WordpressPluginSettings): void {
  AppState.getInstance().markdownParser.use(MarkdownItMathJax3Plugin, {
    outputType: settings.mathJaxOutputType
  });
}


export function rendererProfile(profile: WpProfile, container: HTMLElement): Setting {
  let name = profile.name;
  if (profile.isDefault) {
    name += ' ✔️';
  }
  let desc = profile.endpoint;
  if (profile.wpComOAuth2Token) {
    desc += ` / 🆔 / 🔒`;
  } else {
    if (profile.saveUsername) {
      desc += ` / 🆔 ${profile.username}`;
    }
    if (profile.savePassword) {
      desc += ' / 🔒 ******';
    }
  }
  return new Setting(container)
    .setName(name)
    .setDesc(desc);
}

export function isValidUrl(url: string): boolean {
  try {
    return Boolean(new URL(url));
  } catch(e) {
    return false;
  }
}

export function doClientPublish(plugin: WordpressPlugin, profile: WpProfile, defaultPostParams?: WordPressPostParams): void;
export function doClientPublish(plugin: WordpressPlugin, profileName: string, defaultPostParams?: WordPressPostParams): void;
export function doClientPublish(
  plugin: WordpressPlugin,
  profileOrName: WpProfile | string,
  defaultPostParams?: WordPressPostParams
): void {
  let profile: WpProfile | undefined;
  if (isString(profileOrName)) {
    profile = plugin.settings.profiles.find(it => it.name === profileOrName);
  } else {
    profile = profileOrName;
  }
  if (profile) {
    const client = getWordPressClient(plugin, profile);
    if (client) {
      client.publishPost(defaultPostParams).then();
    }
  } else {
    const noSuchProfileMessage = plugin.i18n.t('error_noSuchProfile', {
      profileName: String(profileOrName)
    });
    new Notice(noSuchProfileMessage, ERROR_NOTICE_TIMEOUT);
    throw new Error(noSuchProfileMessage);
  }
}

// export function _arrayBufferToBase64(buffer: ArrayBuffer): string {
//   return btoa(new Uint8Array(buffer).reduce((data, byte)=> {
//     return data + String.fromCharCode(byte);
//   }, ''));
// }

export function arrayBufferToBlob(buffer: ArrayBuffer): Blob {
  return new Blob([buffer]);
}

// export function isBase64(str: string): boolean {
//   // const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
//   // return base64Regex.test(str);
//   const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
//   return base64Regex.test(str);
//   // try {
//   //   console.log(str, atob(str), btoa(atob(str)), btoa(atob(str)) === str);
//   //   return btoa(atob(str)) === str;
//   // } catch (e) {
//   //   return false;
//   // }
// }
