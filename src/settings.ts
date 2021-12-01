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
  userName: string;

  /**
   * Password of WordPress user.
   */
  password: string;

  showRibbonIcon: boolean;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  endpoint: '',
  userName: '',
  password: '',

  showRibbonIcon: true
}

export class WordpressSettingTab extends PluginSettingTab {
	plugin: WordpressPlugin;

	constructor(app: App, plugin: WordpressPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for WordPress Publish plugin'});

		new Setting(containerEl)
			.setName('WordPress URL')
			.setDesc('Full path of xmlrpc.php, for example, https://example.com/wordpress/xmlrpc.php')
			.addText(text => text
				.setPlaceholder('https://example.com/wordpress/xmlrpc.php')
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
					console.debug('Endpoint: ' + value);
          try {
            new URL(value);
            this.plugin.settings.endpoint = value;
            await this.plugin.saveSettings();
          } catch (e) {
            console.error(e);
          }
				}));
    new Setting(containerEl)
      .setName('WordPress User Name')
      .setDesc('User name of WordPress')
      .addText(text => text
        .setPlaceholder('User name')
        .setValue(this.plugin.settings.userName)
        .onChange(async (value) => {
          console.log('User name: ' + value);
          this.plugin.settings.userName = value;
          await this.plugin.saveSettings();
        }));
    new Setting(containerEl)
      .setName('WordPress Password')
      .setDesc('Password of WordPress')
      .addText(text => text
        .setPlaceholder('Password')
        .setValue(this.plugin.settings.password)
        .onChange(async (value) => {
          console.log('Password: ' + value);
          this.plugin.settings.password = value;
          await this.plugin.saveSettings();
        }));
	}
}
