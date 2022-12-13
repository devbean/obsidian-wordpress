import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { LanguageWithAuto, TranslateKey } from './i18n';


export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI_miniOrange = 'miniOrange',
  RestApi_ApplicationPasswords = 'application-passwords'
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
   * XML-RPC path.
   */
  xmlRpcPath: string;

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

  /**
   * Default comment status.
   */
  defaultCommentStatus: CommentStatus;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  lang: 'auto',
  apiType: ApiType.XML_RPC,
  endpoint: '',
  xmlRpcPath: '/xmlrpc.php',
  saveUsername: false,
  savePassword: false,
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft,
  defaultCommentStatus: CommentStatus.Open
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
    const getApiTypeDesc = (apiType: ApiType): string => {
      switch (apiType) {
        case ApiType.XML_RPC:
          return t('settings_apiTypeXmlRpcDesc');
        case ApiType.RestAPI_miniOrange:
          return t('settings_apiTypeRestMiniOrangeDesc');
        case ApiType.RestApi_ApplicationPasswords:
          return t('settings_apiTypeRestApplicationPasswordsDesc');
        default:
          return '';
      }
    };

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    let apiDesc = getApiTypeDesc(this.plugin.settings.apiType);

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
          .addOption(ApiType.RestApi_ApplicationPasswords, t('settings_apiTypeRestApplicationPasswords'))
          .setValue(this.plugin.settings.apiType)
          .onChange(async (value: ApiType) => {
            this.plugin.settings.apiType = value;
            apiDesc = getApiTypeDesc(this.plugin.settings.apiType);
            await this.plugin.saveSettings();
            this.display();
          });
      });
    containerEl.createEl('p', {
      text: apiDesc
    });
    if (this.plugin.settings.apiType === ApiType.XML_RPC) {
      new Setting(containerEl)
        .setName(t('settings_xmlRpcPath'))
        .setDesc(t('settings_xmlRpcPathDesc'))
        .addText(text => text
          .setPlaceholder('/xmlrpc.php')
          .setValue(this.plugin.settings.xmlRpcPath)
          .onChange(async (value) => {
            this.plugin.settings.xmlRpcPath = value;
            await this.plugin.saveSettings();
          }));
    }
    new Setting(containerEl)
      .setName(t('settings_showRibbonIcon'))
      .setDesc(t('settings_showRibbonIconDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();

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
          });
      });

    new Setting(containerEl)
      .setName(t('settings_defaultPostComment'))
      .setDesc(t('settings_defaultPostCommentDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, t('settings_defaultPostCommentOpen'))
          .addOption(CommentStatus.Closed, t('settings_defaultPostCommentClosed'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultCommentStatus)
          .onChange(async (value: CommentStatus) => {
            this.plugin.settings.defaultCommentStatus = value;
            await this.plugin.saveSettings();
          });
      });
	}

}
