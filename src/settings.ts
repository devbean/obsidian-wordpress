import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';

export interface WordpressPluginSettings {
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
  endpoint: '',
  saveUserName: false,
  showRibbonIcon: false
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
