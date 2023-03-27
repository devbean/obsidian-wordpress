import { Notice, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, WordpressPluginSettings, WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { WordPressPostParams } from './wp-client';
import { getWordPressClient } from './wp-clients';
import { I18n } from './i18n';
import { buildMarked } from './utils';
import { ERROR_NOTICE_TIMEOUT, EventType, WP_OAUTH2_REDIRECT_URI, WP_OAUTH2_URL_ACTION } from './consts';
import { OAuth2Client } from './oauth2-client';
import { CommentStatus, PostStatus } from './wp-api';
import { WpProfile } from './wp-profile';
import { WpProfileChooserModal } from './wp-profile-chooser-modal';
import { AppState } from './app-state';

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

    buildMarked(this.settings);

    addIcons();

    this.registerProtocolHandler();
    this.updateRibbonIcon();

    this.addCommand({
      id: 'defaultPublish',
      name: this.#i18n.t('command_publishWithDefault'),
      editorCallback: () => {
        const defaultProfile = this.#settings?.profiles.find(it => it.isDefault);
        if (defaultProfile) {
          const params: WordPressPostParams = {
            status: this.#settings?.defaultPostStatus ?? PostStatus.Draft,
            commentStatus: this.#settings?.defaultCommentStatus ?? CommentStatus.Open,
            categories: defaultProfile.lastSelectedCategories ?? [ 1 ],
            tags: [],
            title: '',
            content: ''
          };
          this.doClientPublish(defaultProfile, params);
        } else {
          new Notice(this.#i18n?.t('error_noDefaultProfile') ?? 'No default profile found.', ERROR_NOTICE_TIMEOUT);
        }
      }
    });

    this.addCommand({
      id: 'publish',
      name: this.#i18n.t('command_publish'),
      editorCallback: () => {
        this.openProfileChooser();
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
          this.openProfileChooser();
        });
      }
    } else {
      if (this.ribbonWpIcon) {
        this.ribbonWpIcon.remove();
        this.ribbonWpIcon = null;
      }
    }
  }

  private openProfileChooser(): void {
    new WpProfileChooserModal(this.app, this, (profile) => {
      console.log(profile);
      this.doClientPublish(profile);
    }).open();
  }

  private doClientPublish(profile: WpProfile, defaultPostParams?: WordPressPostParams): void {
    const client = getWordPressClient(this.app, this, profile);
    if (client) {
      client.publishPost(defaultPostParams).then();
    }
  }

  private registerProtocolHandler(): void {
    this.registerObsidianProtocolHandler(WP_OAUTH2_URL_ACTION, async (e) => {
      if (e.action === WP_OAUTH2_URL_ACTION) {
        if (e.state) {
          if (e.error) {
            new Notice(this.i18n.t('error_wpComAuthFailed', {
              error: e.error,
              desc: e.error_description.replace(/\+/g,' ')
            }), ERROR_NOTICE_TIMEOUT);
            AppState.getInstance().events.trigger(EventType.OAUTH2_TOKEN_GOT, undefined);
          } else if (e.code) {
            const token = await OAuth2Client.getWpOAuth2Client(this).getToken({
              code: e.code,
              redirectUri: WP_OAUTH2_REDIRECT_URI,
              codeVerifier: AppState.getInstance().codeVerifier
            });
            console.log(token);
            AppState.getInstance().events.trigger(EventType.OAUTH2_TOKEN_GOT, token);
          }
        }
      }
    });
  }

}
