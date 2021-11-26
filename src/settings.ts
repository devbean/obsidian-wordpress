import { App, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';

export interface WordpressPluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
	mySetting: 'default'
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

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
