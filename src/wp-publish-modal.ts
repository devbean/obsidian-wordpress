import { Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressPostParams } from './wp-client';
import { CommentStatus, PostStatus, Term } from './wp-api';
import { toNumber } from 'lodash-es';
import { TranslateKey } from './i18n';


export function openPublishModal(
  plugin: WordpressPlugin,
  categories: Term[],
  selectedCategories: number[]
): Promise<{ postParams: WordPressPostParams, publishModal: Modal }> {
  return new Promise((resolve, reject) => {
    const modal = new WpPublishModal(
      plugin,
      categories, selectedCategories,
      (postParams, publishModal) => {
        resolve({
          postParams,
          publishModal
        });
      });
    modal.open();
  });
}

/**
 * WordPress publish modal.
 */
export class WpPublishModal extends Modal {

  constructor(
    private readonly plugin: WordpressPlugin,
    private readonly categories: Term[],
    private readonly selectedCategories: number[],
    private readonly onSubmit: (params: WordPressPostParams, modal: Modal) => void
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const params: WordPressPostParams = {
      status: this.plugin.settings.defaultPostStatus,
      commentStatus: this.plugin.settings.defaultCommentStatus,
      categories: this.selectedCategories,
      tags: [],
      title: '',
      content: ''
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('publishModal_title') });

    new Setting(contentEl)
      .setName(t('publishModal_postStatus'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, t('publishModal_postStatusDraft'))
          .addOption(PostStatus.Publish, t('publishModal_postStatusPublish'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange((value) => {
            params.status = value as PostStatus;
          });
      });
    new Setting(contentEl)
      .setName(t('publishModal_commentStatus'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, t('publishModal_commentStatusOpen'))
          .addOption(CommentStatus.Closed, t('publishModal_commentStatusClosed'))
          .setValue(this.plugin.settings.defaultCommentStatus)
          .onChange((value) => {
            params.commentStatus = value as CommentStatus;
          });
      });
    if (this.categories.length > 0) {
      new Setting(contentEl)
        .setName(t('publishModal_category'))
        .addDropdown((dropdown) => {
          this.categories.forEach(it => {
            dropdown.addOption(it.id, it.name);
          });
          dropdown
            .setValue(String(this.selectedCategories[0]))
            .onChange((value) => {
              params.categories = [ toNumber(value) ];
            });
        });
    }
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('publishModal_publishButtonText'))
        .setCta()
        .onClick(() => {
          this.onSubmit(params, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
