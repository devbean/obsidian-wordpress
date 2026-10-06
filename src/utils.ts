import { App, Notice, Setting, TFile } from 'obsidian';
import { WpProfile } from './wp-profile';
import { WordpressPluginSettings } from './plugin-settings';
import { MarkdownItMathJax3PluginInstance } from './markdown-it-mathjax3-plugin';
import { WordPressClientResult, WordPressClientReturnCode, WordPressPostParams } from './wp-client';
import WordpressPlugin from './main';
import { isString } from 'lodash-es';
import { ERROR_NOTICE_TIMEOUT } from './consts';
import { format } from 'date-fns';
import { MatterData } from './types';
import { MarkdownItCommentPluginInstance } from './markdown-it-comment-plugin';

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
  MarkdownItMathJax3PluginInstance.updateOutputType(settings.mathJaxOutputType);
  MarkdownItCommentPluginInstance.updateConvertMode(settings.commentConvertMode);
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
    const selectedProfile = profile;
    import('./wp-clients').then(({getWordPressClient}) => {
      const client = getWordPressClient(plugin, selectedProfile);
      if (client) return client.publishPost(defaultPostParams);
    }).catch(showError);
  } else {
    const noSuchProfileMessage = plugin.i18n.t('error_noSuchProfile', {
      profileName: String(profileOrName)
    });
    showError(noSuchProfileMessage);
    throw new Error(noSuchProfileMessage);
  }
}

export function getBoundary(): string {
  return `----obsidianBoundary${format(new Date(), 'yyyyMMddHHmmss')}`;
}

export function showError<T>(error: unknown): WordPressClientResult<T> {
  let errorMessage: string;
  if (isString(error)) {
    errorMessage = error;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = (error as SafeAny).toString();
  }
  new Notice(`❌ ${ errorMessage }`, ERROR_NOTICE_TIMEOUT);
  return {
    code: WordPressClientReturnCode.Error as const,
    error: {
      code: WordPressClientReturnCode.Error,
      message: errorMessage,
    }
  };
}

export async function processFile(file: TFile, app: App): Promise<{ content: string, matter: MatterData }> {
  // only read the frontmatter from the metadata cache, never
  // create or modify the frontmatter of the note
  const fm = app.metadataCache.getFileCache(file)?.frontmatter;
  const raw = await app.vault.read(file);
  return {
    content: stripFrontmatter(raw),
    matter: { ...fm }
  };
}

/**
 * Strips the YAML frontmatter from the raw note content.
 * Returns the content as-is if it does not start with a frontmatter block.
 */
export function stripFrontmatter(raw: string): string {
  if (!raw.startsWith('---')) {
    return raw.trim();
  }
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return raw.trim();
  }
  return raw.substring(match[0].length).trim();
}
