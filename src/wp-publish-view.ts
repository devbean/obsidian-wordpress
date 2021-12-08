import { ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import WordpressPlugin from './main';
import { createWordPressClient } from './wp-client';

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
    // const container = this.containerEl.children[1];
    // const rootEl = document.createElement('div');

    // const button = rootEl.createDiv({ cls: 'action-button', title: 'Publish' });
    // button.onClickEvent(() => {
    //   console.log('Do publish');
    // });
    // const text = rootEl.createSpan('Publish');
    // button.appendChild(text);
    // // button.appendChild(icons['wp-logo']);
    const actionButtonsControlDiv = this.contentEl.createEl('div');
    // vantageButtonsControlDiv.addClass("setting-item-control");
    new ButtonComponent(actionButtonsControlDiv)
      .setButtonText('Publish')
      .setClass('mod-cta')
      .onClick(() => {
        const client = createWordPressClient(this.app, this.plugin, 'xmlrpc');
        client.newPost().then();
      });

    // const button = container.createEl('div', { cls: 'book' });
    // button.createEl('div', { text: 'Publish', cls: 'action-button' });
    // button.onClickEvent(() => {
    //   console.log(this.settings);
    //
    // });
    // book.createEl('small', { text: 'Sönke Ahrens', cls: 'book__author' });

    // containerEl.empty();
    // containerEl.appendChild(rootEl);
  }

}
