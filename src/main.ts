import { Editor, MarkdownView, Plugin } from 'obsidian';
import { DEFAULT_SETTINGS, WordpressPluginSettings, WordpressSettingTab } from './settings';
import { addIcons } from './icons';
import { WordPressPublishView, WordPressPublishViewType } from './wp-publish-view';
import { createWordPressClient } from './wp-client';

export default class WordpressPlugin extends Plugin {

  settings: WordpressPluginSettings;

  async onload() {
    console.log('loading obsidian-wordpress plugin');

    await this.loadSettings();

    this.registerView(
      WordPressPublishViewType,
      leaf => new WordPressPublishView(leaf, this)
    );

    addIcons();

    if (this.settings.showRibbonIcon) {
      this.addRibbonIcon('wp-logo', 'WordPress Publish', () => {
        this.toggleWordPressPublishView();
      });
    }

    this.addCommand({
      id: 'publish',
      name: 'Publish current document',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        const client = createWordPressClient(this.app, this, 'xmlrpc');
        client.newPost().then();
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

  private async toggleWordPressPublishView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(WordPressPublishViewType);
    if (existing.length) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: WordPressPublishViewType,
      active: true,
    });

    this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(WordPressPublishViewType)[0]);
  }

}
