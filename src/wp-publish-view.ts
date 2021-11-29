import { ItemView, WorkspaceLeaf } from 'obsidian';
import { WordpressPluginSettings } from './settings';

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
    const rootEl = document.createElement('div');

    const navHeader = rootEl.createDiv({ cls: 'nav-header' });
  }

}
