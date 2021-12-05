import { ButtonComponent, Editor, ItemView, MarkdownView, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { WordpressPluginSettings } from './settings';
import { createWordPressClient, WordPressClientReturnCode } from './wp-client';
import { createWordPressPost } from './wp-types';

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
    const vantageButtonsControlDiv = this.contentEl.createEl('div');
    // vantageButtonsControlDiv.addClass("setting-item-control");
    new ButtonComponent(vantageButtonsControlDiv)
      .setButtonText('Publish')
      .setClass('mod-cta')
      .onClick(() => {
        let editor: Editor;
        const leaf = this.app.workspace.getMostRecentLeaf();
        if (leaf.view instanceof MarkdownView) {
          editor = leaf.view.editor;
          console.log(editor.getValue());
        } else {
          console.warn('Advanced Tables: Unable to determine current editor.');
          return;
        }
        const file = this.app.workspace.getActiveFile();
        const client = createWordPressClient(this.settings, 'xmlrpc');
        client.newPost(createWordPressPost({
          post_title: file?.basename ?? 'A Post from Obsidian!',
          post_content: editor.getValue() ?? '',
        }))
          .then(result => {
            new Notice('Post published successfully!');
          })
          .catch(error => {
            new Notice(`[Error] ${error.message}`);
          });
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
