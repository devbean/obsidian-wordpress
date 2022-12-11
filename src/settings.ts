import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { PostStatus } from './wp-api';
import { LanguageWithAuto, TranslateKey } from './i18n';


export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI_miniOrange = 'miniOrange'
}

export interface WordpressPluginSettings {

  /**
   * Plugin language.
   */
  lang: LanguageWithAuto;

  /**
   * API type.
   */
  apiType: ApiType;

  /**
   * Endpoint.
   */
  endpoint: string;

  /**
   * WordPress username.
   */
  username?: string;

  /**
   * WordPress password.
   */
  password?: string;

  /**
   * Save username to local data.
   */
  saveUsername: boolean;

  /**
   * Save user password to local data.
   */
  savePassword: boolean;

  /**
   * Show plugin icon in side.
   */
  showRibbonIcon: boolean;

  /**
   * Default post status.
   */
  defaultPostStatus: PostStatus;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  lang: 'auto',
  apiType: ApiType.XML_RPC,
  endpoint: '',
  saveUsername: false,
  savePassword: false,
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft
}

export class WordpressSettingTab extends PluginSettingTab {

	constructor(
    app: App,
    private readonly plugin: WordpressPlugin
  ) {
		super(app, plugin);
	}

	display(): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

		new Setting(containerEl)
			.setName(t('settings_url'))
			.setDesc(t('settings_urlDesc'))
			.addText(text => text
				.setPlaceholder(t('settings_urlPlaceholder'))
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
          this.plugin.settings.endpoint = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName(t('settings_apiType'))
      .setDesc(t('settings_apiTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(ApiType.XML_RPC, t('settings_apiTypeXmlRpc'))
          .addOption(ApiType.RestAPI_miniOrange, t('settings_apiTypeRestMiniOrange'))
          .setValue(this.plugin.settings.apiType)
          .onChange(async (value: ApiType) => {
            this.plugin.settings.apiType = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });
    new Setting(containerEl)
      .setName(t('settings_showRibbonIcon'))
      .setDesc(t('settings_showRibbonIconDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();
            this.display();

            this.plugin.updateRibbonIcon();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_defaultPostStatus'))
      .setDesc(t('settings_defaultPostStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, t('settings_defaultPostStatusDraft'))
          .addOption(PostStatus.Publish, t('settings_defaultPostStatusPublish'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange(async (value: PostStatus) => {
            this.plugin.settings.defaultPostStatus = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });
	}

}
