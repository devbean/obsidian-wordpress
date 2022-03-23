import { ButtonComponent, DropdownComponent, ItemView, WorkspaceLeaf } from 'obsidian';
import WordpressPlugin from './main';
import { createWordPressClient, WordPressPostParams } from './wp-client';
import { ApiType } from './settings';
import { PostStatus } from './wp-api';

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
    const params: WordPressPostParams = {
      status: this.plugin.settings.defaultPostStatus
    };

    const { containerEl } = this;

    containerEl.empty();

    const controlsContainer = containerEl.createDiv({
      cls: 'publish-view-wrapper'
    }).createDiv({
      cls: 'publish-view-container'
    });

    controlsContainer.createSpan({ text: 'Post Status' });
    new DropdownComponent(controlsContainer)
      .addOption(PostStatus.Draft, 'draft')
      .addOption(PostStatus.Publish, 'publish')
      .addOption(PostStatus.Future, 'future')
      .setValue(this.plugin.settings.defaultPostStatus)
      .onChange(async (value: PostStatus) => {
        params.status = value;
      });

    new ButtonComponent(controlsContainer)
      .setButtonText('Publish')
      .setClass('mod-cta')
      .onClick(() => {
        const client = createWordPressClient(this.app, this.plugin, ApiType.XML_RPC);
        if (client) {
          client.newPost(params).then();
        }
      });
  }

}
