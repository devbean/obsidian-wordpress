import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';

export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI_Jetpack = 'restapi-jetpack',
  RestAPI_OAuth2 = 'restapi-oauth2'
}

export interface WordpressPluginSettings {

  /**
   * API type.
   */
  apiType: ApiType;

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
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  apiType: ApiType.XML_RPC,
  endpoint: '',
  saveUserName: false,
  showRibbonIcon: false
};

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

    containerEl.createEl('h2', {text: 'Settings for WordPress Publish plugin'});

    new Setting(containerEl)
      .setName('WordPress URL')
      .setDesc('Full path of installed WordPress, for example, https://example.com/wordpress')
      .addText(text => text
        .setPlaceholder('https://example.com/wordpress')
        .setValue(this.plugin.settings.endpoint)
        .onChange(async (value) => {
          this.plugin.settings.endpoint = value;
          await this.plugin.saveSettings();
          this.display();
        }));
    new Setting(containerEl)
      .setName('API Type')
      .setDesc(`Select which API you want to use.
- XML-RPC: Enabled by default but some host may disable it
- REST API with Jetpack
- REST API with OAuth2`)
      .addDropdown((dropdown) => {
        dropdown
          .addOption(ApiType.XML_RPC, 'XML-RPC')
          .addOption(ApiType.RestAPI_Jetpack, 'REST API with Jetpack')
          .addOption(ApiType.RestAPI_OAuth2, 'REST API with OAuth2')
          .setValue(this.plugin.settings.apiType)
          .onChange(async (value: ApiType) => {
            this.plugin.settings.apiType = value;
            await this.plugin.saveSettings();
            this.display();
          });
      });
    if (this.plugin.settings.apiType === ApiType.XML_RPC) {
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
              this.display();
            }));
      } else {
        delete this.plugin.settings.userName;
      }
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
          }),
      );
  }
}
