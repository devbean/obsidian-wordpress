import { Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, WordpressPluginSettings, WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { WordPressPostParams } from './wp-client';
import { getWordPressClient } from './wp-clients';
import { I18n } from './i18n';
import { CommentStatus, PostStatus } from './wp-api';

export default class WordpressPlugin extends Plugin {

  #settings: WordpressPluginSettings | undefined;
  get settings() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#settings!;
  }

  #i18n: I18n | undefined;
  get i18n() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#i18n!;
  }

  private ribbonWpIcon: HTMLElement | null = null;

  async onload() {
    console.log('loading obsidian-wordpress plugin');

    await this.loadSettings();

    // lang should be load early, but after settings
    this.#i18n = new I18n(this.#settings?.lang);

    addIcons();

    this.updateRibbonIcon();

    this.addCommand({
      id: 'defaultPublish',
      name: this.#i18n.t('command_publishWithDefault'),
      editorCallback: () => {
        const params: WordPressPostParams = {
          status: this.#settings?.defaultPostStatus ?? PostStatus.Draft,
          commentStatus: this.#settings?.defaultCommentStatus ?? CommentStatus.Open,
          categories: [ 1 ],
          tags: [],
          title: '',
          content: ''
        };
        this.clientPublish(params);
      }
    });

    this.addCommand({
      id: 'publish',
      name: this.#i18n.t('command_publish'),
      editorCallback: () => {
        this.clientPublish();
      }
    });

    this.addSettingTab(new WordpressSettingTab(this.app, this));
  }

  onunload() {
  }

  async loadSettings() {
    this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.#settings);
  }

  updateRibbonIcon(): void {
    const ribbonIconTitle = this.#i18n?.t('ribbon_iconTitle') ?? 'WordPress';
    if (this.#settings?.showRibbonIcon) {
      if (!this.ribbonWpIcon) {
        this.ribbonWpIcon = this.addRibbonIcon('wp-logo', ribbonIconTitle, () => {
          this.clientPublish();
        });
      }
    } else {
      if (this.ribbonWpIcon) {
        this.ribbonWpIcon.remove();
        this.ribbonWpIcon = null;
      }
    }
  }

  private clientPublish(defaultPostParams?: WordPressPostParams): void {
    const client = getWordPressClient(this.app, this);
    if (client) {
      client.publishPost(defaultPostParams).then();
    }
  }

}
