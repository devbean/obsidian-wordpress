import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { PostStatus } from './wp-api';

export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI = 'restapi'
}

export const enum RestApiPlugin {
  Authentication_miniOrange = 'miniOrange'
}

export interface WordpressPluginSettings {

  /**
   * API type.
   */
  apiType: ApiType;

  /**
   * Plugin for REST API.
   */
  restApiPlugin?: RestApiPlugin;

  /**
   * Endpoint.
   */
  endpoint: string;

  /**
   * WordPress user name.
   */
  userName?: string;

  /**
   * Save user name to local data.
   */
  saveUserName: boolean;

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
  apiType: ApiType.XML_RPC,
  endpoint: '',
  saveUserName: false,
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
		const {containerEl} = this;

		containerEl.empty();

    containerEl.createEl('h2', { text: 'Settings for WordPress plugin' });

		new Setting(containerEl)
			.setName('WordPress URL')
			.setDesc('Full path of installed WordPress, for example, https://example.com/wordpress')
			.addText(text => text
				.setPlaceholder('https://example.com/wordpress')
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
          this.plugin.settings.endpoint = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('Save User Name')
      .setDesc(`If enabled, the WordPress user name you typed will be saved in local data.
This might be user name disclosure in synchronize services.`)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.saveUserName)
          .onChange(async (value) => {
            this.plugin.settings.saveUserName = value;
            await this.plugin.saveSettings();
            this.display();
          }),
      );
    if (this.plugin.settings.saveUserName) {
      new Setting(containerEl)
        .setName('WordPress User Name')
        .setDesc('User name of WordPress')
        .addText(text => text
          .setPlaceholder('User name')
          .setValue(this.plugin.settings.userName)
          .onChange(async (value) => {
            this.plugin.settings.userName = value;
            await this.plugin.saveSettings();
          }));
    } else {
      delete this.plugin.settings.userName;
    }
    new Setting(containerEl)
      .setName('API Type')
      .setDesc('Select which API you want to use.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption(ApiType.XML_RPC, 'XML-RPC')
          .addOption(ApiType.RestAPI, 'REST API')
          .setValue(this.plugin.settings.apiType)
          .onChange(async (value: ApiType) => {
            this.plugin.settings.apiType = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });
    if (this.plugin.settings.apiType === ApiType.XML_RPC) {
      // something for XML-RPC
    } else if (this.plugin.settings.apiType === ApiType.RestAPI) {
      if (!this.plugin.settings.restApiPlugin) {
        this.plugin.settings.restApiPlugin = RestApiPlugin.Authentication_miniOrange;
      }
      new Setting(containerEl)
        .setName('REST API Plugin')
        .setDesc(`Select which auth plugin for REST API you installed.`)
        .addDropdown((dropdown) => {
          dropdown
            .addOption(RestApiPlugin.Authentication_miniOrange, 'WordPress REST API Authentication by miniOrange')
            .setValue(this.plugin.settings.restApiPlugin)
            .onChange(async (value: RestApiPlugin) => {
              this.plugin.settings.restApiPlugin = value;
              await this.plugin.saveSettings();
              this.display();
            });
        });
    }
    new Setting(containerEl)
      .setName('Show icon in sidebar')
      .setDesc(`If enabled, a button which opens publish panel will be added to the Obsidian sidebar.
Changes only take effect on reload.`)
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
      .setName('Default Post Status')
      .setDesc('Post status which will be published to WordPress.')
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, 'draft')
          .addOption(PostStatus.Publish, 'publish')
          .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange(async (value: PostStatus) => {
            this.plugin.settings.defaultPostStatus = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });
	}
}
