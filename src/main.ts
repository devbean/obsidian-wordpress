import { Editor, MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, WordpressPluginSettings, WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { WordPressPostParams } from './wp-client';
import { getWordPressClient } from './wp-clients';

export default class WordpressPlugin extends Plugin {

	settings: WordpressPluginSettings;

	async onload() {
    console.log('loading obsidian-wordpress plugin');

		await this.loadSettings();

    addIcons();

    this.updateRibbonIcon();

    this.addCommand({
      id: 'defaultPublish',
      name: 'Publish current document with default options',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const params: WordPressPostParams = {
          status: this.settings.defaultPostStatus
        };
        this.publishPost(params);
      }
    });

    this.addCommand({
      id: 'publish',
      name: 'Publish current document',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        this.publishPost();
      }
    });

		this.addSettingTab(new WordpressSettingTab(this.app, this));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

  updateRibbonIcon(): void {
    const ribbonIconTitle = 'WordPress Publish';
    if (this.settings.showRibbonIcon) {
      this.addRibbonIcon('wp-logo', ribbonIconTitle, () => {
        this.publishPost();
      });
    } else {
      const leftRibbon: any = this.app.workspace.leftRibbon; // eslint-disable-line
      const children = leftRibbon.ribbonActionsEl.children;
      for (let i = 0; i < children.length; i++) {
        if (children.item(i).getAttribute('aria-label') === ribbonIconTitle) {
          (children.item(i) as HTMLElement).style.display = 'none';
        }
      }
    }
  }

  private publishPost(defaultPostParams?: WordPressPostParams): void {
    const client = getWordPressClient(this.app, this);
    if (client) {
      client.newPost(defaultPostParams).then();
    }
  }

}
