import { Setting } from 'obsidian';
import { WpProfile } from './wp-profile';
import { AppState } from './app-state';
import { WordpressPluginSettings } from './plugin-settings';
import MarkdownItMathJax3Plugin from './markdown-it-mathjax3-plugin';

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
