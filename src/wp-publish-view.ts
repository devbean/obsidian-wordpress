import { ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import WordpressPlugin from './main';
import { createWordPressClient } from './wp-client';
import { ApiType } from './settings';

export const WordPressPublishViewType = 'wp-publish-options';

export class WordPressPublishView extends ItemView {

  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: WordpressPlugin
  ) {
    super(leaf);
  }

  getDisplayText(): string {
    return 'WordPress Publish';
  }

  getViewType(): string {
    return WordPressPublishViewType;
  }

  getIcon(): string {
    return 'wp-logo';
  }

  load(): void {
    super.load();
    this.draw();
  }

  private draw(): void {
    const actionButtonsControlDiv = this.contentEl.createEl('div');
    new ButtonComponent(actionButtonsControlDiv)
      .setButtonText('Publish')
      .setClass('mod-cta')
      .onClick(() => {
        const client = createWordPressClient(this.app, this.plugin, ApiType.XML_RPC);
        if (client) {
          client.newPost().then();
        }
      });
  }

}
