import { Menu, Notice, Plugin, TAbstractFile, TFile, TFolder } from 'obsidian';
import { WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { WordPressPostParams } from './wp-client';
import { I18n } from './i18n';
import { EventType, WP_OAUTH2_REDIRECT_URI, WP_OAUTH2_URL_ACTION } from './consts';
import { OAuth2Client } from './oauth2-client';
import { CommentStatus, PostStatus, PostTypeConst } from './wp-api';
import { openProfileChooserModal } from './wp-profile-chooser-modal';
import { AppState } from './app-state';
import { DEFAULT_SETTINGS, settingsForPersistence, SettingsVersion, upgradeSettings, WordpressPluginSettings } from './plugin-settings';
import { PassCrypto } from './pass-crypto';
import { doClientPublish, setupMarkdownParser, showError } from './utils';
import { BatchPublishModal } from './batch-publish-modal';
import { collectBatchFiles } from './batch-publish';

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
  private batchOpen = false;
  private activeBatchModal: BatchPublishModal | null = null;

  async onload() {
    console.log('loading obsidian-wordpress plugin');

    await this.loadSettings();
    // lang should be load early, but after settings
    this.#i18n = new I18n(this.#settings?.lang);

    setupMarkdownParser(this.settings);

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
            postType: PostTypeConst.Post,
            tags: [],
            title: '',
            content: ''
          };
          doClientPublish(this, defaultProfile, params);
        } else {
          showError(this.#i18n?.t('error_noDefaultProfile') ?? 'No default profile found.');
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

    this.addCommand({id:'batchPublish',name:this.i18n.t('command_batchPublish'),callback:() => this.openBatchPublish()});
    const batchMenuContexts = new WeakMap<Menu, {selection: TAbstractFile[], multiple: boolean}>();
    const addBatchMenu = (menu: Menu, selection: TAbstractFile[], multiple = false): void => {
      if (!selection.some(file => file instanceof TFolder || (file instanceof TFile && file.extension.toLowerCase() === 'md'))) return;
      const existing = batchMenuContexts.get(menu);
      if (existing) {
        if (multiple || !existing.multiple) {
          existing.selection = [...selection];
          existing.multiple = multiple;
        }
        return;
      }
      // Capture the context before the explorer clears its selection on close.
      const context = {selection: [...selection], multiple};
      batchMenuContexts.set(menu,context);
      menu.addItem(item => item.setTitle(this.i18n.t('command_batchPublish')).setIcon('wp-logo')
        .onClick(() => this.openBatchPublish(context.selection)));
    };
    this.registerEvent(this.app.workspace.on('file-menu',(menu,file) => addBatchMenu(menu,[file])));
    this.registerEvent(this.app.workspace.on('files-menu',(menu,files) => addBatchMenu(menu,files,true)));

    this.addSettingTab(new WordpressSettingTab(this));
  }

  onunload() {
    this.activeBatchModal?.close();
  }

  async loadSettings() {
    this.#settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    const { needUpgrade, settings } = await upgradeSettings(this.#settings, SettingsVersion.V2);
    this.#settings = settings;
    if (needUpgrade) {
      await this.saveSettings();
    }

    const crypto = new PassCrypto();
    const count = this.#settings?.profiles.length ?? 0;
    for (let i = 0; i < count; i++) {
      const profile = this.#settings?.profiles[i];
      const enPass = profile.encryptedPassword;
      if (enPass) {
        profile.password = await crypto.decrypt(enPass.encrypted, enPass.key, enPass.vector);
      }
    }

    AppState.markdownParser.set({
      html: this.#settings?.enableHtml ?? false
    });
  }

  async saveSettings() {
    await this.saveData(await settingsForPersistence(this.settings));
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

  private async openProfileChooser() {
    if (this.settings.profiles.length === 1) {
      doClientPublish(this, this.settings.profiles[0]);
    } else if (this.settings.profiles.length > 1) {
      const profile = await openProfileChooserModal(this);
      doClientPublish(this, profile);
    } else {
      showError(this.i18n.t('error_noProfile'));
    }
  }

  private openBatchPublish(selection: TAbstractFile[] = []): void {
    if (!this.settings.profiles.length) { showError(this.i18n.t('error_noProfile')); return; }
    if (this.batchOpen) { new Notice(this.i18n.t('batch_alreadyOpen')); return; }
    this.batchOpen = true;
    const initialFolder = selection.length === 1 && selection[0] instanceof TFolder ? selection[0].path : '';
    const modal = new BatchPublishModal(this,collectBatchFiles(this.app,selection),() => {
      if (this.activeBatchModal === modal) {this.activeBatchModal = null;this.batchOpen = false;}
    },initialFolder);
    this.activeBatchModal = modal;
    modal.open();
  }

  private registerProtocolHandler(): void {
    this.registerObsidianProtocolHandler(WP_OAUTH2_URL_ACTION, async (e) => {
      if (e.action === WP_OAUTH2_URL_ACTION) {
        if (e.state) {
          if (e.error) {
            showError(this.i18n.t('error_wpComAuthFailed', {
              error: e.error,
              desc: e.error_description.replace(/\+/g,' ')
            }));
            AppState.events.trigger(EventType.OAUTH2_TOKEN_GOT, undefined);
          } else if (e.code) {
            const token = await OAuth2Client.getWpOAuth2Client(this).getToken({
              code: e.code,
              redirectUri: WP_OAUTH2_REDIRECT_URI,
              codeVerifier: AppState.codeVerifier
            });
            AppState.events.trigger(EventType.OAUTH2_TOKEN_GOT, token);
          }
        }
      }
    });
  }

}
