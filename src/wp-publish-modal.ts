import { Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressPostParams } from './wp-client';
import { CommentStatus, PostStatus, PostType, PostTypeConst, Term } from './wp-api';
import { toNumber } from 'lodash-es';
import { TranslateKey } from './i18n';
import { MatterData } from './types';
import { ConfirmCode, openConfirmModal } from './confirm-modal';


/**
 * WordPress publish modal.
 */
export class WpPublishModal extends Modal {

  constructor(
    private readonly plugin: WordpressPlugin,
    private readonly categories: {
      items: Term[],
      selected: number[]
    },
    private readonly postTypes: {
      items: PostType[],
      selected: PostType
    },
    private readonly onSubmit: (params: WordPressPostParams, matterData: MatterData) => void,
    private readonly matterData: MatterData,
  ) {
    super(plugin.app);
  }

  onOpen() {
    const params: WordPressPostParams = {
      status: this.plugin.settings.defaultPostStatus,
      commentStatus: this.plugin.settings.defaultCommentStatus,
      postType: this.postTypes.selected,
      categories: this.categories.selected,
      tags: [],
      title: '',
      content: ''
    };

    this.display(params);
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

  private display(params: WordPressPostParams): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.empty();
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

    if (!this.matterData?.postId) {
      new Setting(contentEl)
        .setName(t('publishModal_postType'))
        .addDropdown((dropdown) => {
          this.postTypes.items.forEach(it => {
            dropdown.addOption(it, it);
          });
          dropdown
            .setValue(params.postType)
            .onChange((value) => {
              params.postType = value as PostType;
              this.display(params);
            });
        });
    }

    if (params.postType !== 'page') {
      if (this.categories.items.length > 0) {
        new Setting(contentEl)
          .setName(t('publishModal_category'))
          .addDropdown((dropdown) => {
            this.categories.items.forEach(it => {
              dropdown.addOption(it.id, it.name);
            });
            dropdown
              .setValue(String(params.categories[0]))
              .onChange((value) => {
                params.categories = [ toNumber(value) ];
              });
          });
      }
    }
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('publishModal_publishButtonText'))
        .setCta()
        .onClick(() => {
          if (this.matterData) {
            if (this.matterData.postType !== PostTypeConst.Post && (this.matterData.tags || this.matterData.categories)) {
              openConfirmModal({
                message: t('publishModal_wrongMatterDataForPage')
              }, this.plugin)
                .then(result => {
                  if (result.code === ConfirmCode.Confirm) {
                    delete this.matterData?.tags;
                    delete this.matterData?.categories;
                    this.onSubmit(params, this.matterData);
                  }
                });
            }
          } else {
            this.onSubmit(params, this.matterData);
          }
        })
      );
  }

}
