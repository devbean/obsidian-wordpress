import { ItemView, Notice, WorkspaceLeaf } from 'obsidian';
import { WordpressPluginSettings } from './settings';
import { createWordPressClient } from './wp-client';

export const WordPressPublishViewType = 'wp-publish-options';

export class WordPressPublishView extends ItemView {

  constructor(
    leaf: WorkspaceLeaf,
    private readonly settings: WordpressPluginSettings
  ) {
    super(leaf);
    this.settings = settings;
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
    const container = this.containerEl.children[1];
    // const rootEl = document.createElement('div');

    // const button = rootEl.createDiv({ cls: 'action-button', title: 'Publish' });
    // button.onClickEvent(() => {
    //   console.log('Do publish');
    // });
    // const text = rootEl.createSpan('Publish');
    // button.appendChild(text);
    // // button.appendChild(icons['wp-logo']);

    const button = container.createEl('div', { cls: 'book' });
    button.createEl('div', { text: 'Publish', cls: 'action-button' });
    button.onClickEvent(() => {
      console.log(this.settings);
      const client = createWordPressClient(this.settings, 'xmlrpc');
      client.newPost({
        post_type: 'post',
        post_status: 'draft',
        post_title: 'Hello, Obsidian!',
        post_content: 'This is a new post from Obsidian!'
      })
        .then(success => {
          if (success) {
            new Notice('Post published successfully!');
          }
        });
    });
    // book.createEl('small', { text: 'Sönke Ahrens', cls: 'book__author' });

    // containerEl.empty();
    // containerEl.appendChild(rootEl);
  }

}
