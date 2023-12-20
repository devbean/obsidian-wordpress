import { Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressPostParams } from './wp-client';
import { CommentStatus, PostStatus, PostType, PostTypeConst, Term } from './wp-api';
import { toNumber } from 'lodash-es';
import { MatterData } from './types';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import { AbstractModal } from './abstract-modal';
import IMask, { DynamicMaskType, InputMask } from 'imask';
import { SafeAny } from './utils';
import { format, parse } from 'date-fns';


/**
 * WordPress publish modal.
 */
export class WpPublishModal extends AbstractModal {

  private dateInputMask: InputMask<DynamicMaskType> | null = null;

  constructor(
    readonly plugin: WordpressPlugin,
    private readonly categories: {
      items: Term[],
      selected: number[]
    },
    private readonly postTypes: {
      items: PostType[],
      selected: PostType
    },
    private readonly onSubmit: (params: WordPressPostParams, updateMatterData: (matter: MatterData) => void) => void,
    private readonly matterData: MatterData,
  ) {
    super(plugin);
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
    if (this.dateInputMask) {
      this.dateInputMask.destroy();
    }
  }

  private display(params: WordPressPostParams): void {
    const { contentEl } = this;

    contentEl.empty();

    this.createHeader(this.t('publishModal_title'));

    new Setting(contentEl)
      .setName(this.t('publishModal_postStatus'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, this.t('publishModal_postStatusDraft'))
          .addOption(PostStatus.Publish, this.t('publishModal_postStatusPublish'))
          .addOption(PostStatus.Private, this.t('publishModal_postStatusPrivate'))
          .addOption(PostStatus.Future, this.t('publishModal_postStatusFuture'))
          .setValue(params.status)
          .onChange((value) => {
            params.status = value as PostStatus;
            this.display(params);
          });
      });

    if (params.status === PostStatus.Future) {
      new Setting(contentEl)
        .setName(this.t('publishModal_postDateTime'))
        .setDesc(this.t('publishModal_postDateTimeDesc'))
        .addText(text => {
          const dateFormat = 'yyyy-MM-dd';
          const dateTimeFormat = 'yyyy-MM-dd HH:mm:ss';
          const dateBlocks = {
            yyyy: {
              mask: IMask.MaskedRange,
              from: 1970,
              to: 9999,
            },
            MM: {
              mask: IMask.MaskedRange,
              from: 1,
              to: 12,
            },
            dd: {
              mask: IMask.MaskedRange,
              from: 1,
              to: 31,
            },
          };
          const dateMask = {
            mask: Date,
            lazy: false,
            overwrite: true,
          };
          if (this.dateInputMask) {
            this.dateInputMask.destroy();
          }
          this.dateInputMask = IMask(text.inputEl, [
            {
              ...dateMask,
              pattern: dateFormat,
              blocks: dateBlocks,
              format: (date: SafeAny) => format(date, dateFormat),
              parse: (str: string) => parse(str, dateFormat, new Date())
            },
            {
              ...dateMask,
              pattern: dateTimeFormat,
              blocks: {
                ...dateBlocks,
                HH: {
                  mask: IMask.MaskedRange,
                  from: 0,
                  to: 23,
                },
                mm: {
                  mask: IMask.MaskedRange,
                  from: 0,
                  to: 59,
                },
                ss: {
                  mask: IMask.MaskedRange,
                  from: 0,
                  to: 59,
                },
              },
              format: (date: SafeAny) => format(date, dateTimeFormat),
              parse: (str: string) => parse(str, dateTimeFormat, new Date())
            }
          ]);

          this.dateInputMask.on('accept', () => {
            if (this.dateInputMask) {
              if (this.dateInputMask.masked.isComplete) {
                text.inputEl.style.borderColor = '';
                params.datetime = this.dateInputMask.typedValue;
              } else {
                text.inputEl.style.borderColor = 'red';
              }
            }
          });
        });
    } else {
      delete params.datetime;
    }

    new Setting(contentEl)
      .setName(this.t('publishModal_commentStatus'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, this.t('publishModal_commentStatusOpen'))
          .addOption(CommentStatus.Closed, this.t('publishModal_commentStatusClosed'))
          .setValue(params.commentStatus)
          .onChange((value) => {
            params.commentStatus = value as CommentStatus;
          });
      });

    if (!this.matterData?.postId) {
      new Setting(contentEl)
        .setName(this.t('publishModal_postType'))
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

    if (params.postType === PostTypeConst.Post) {
      if (this.categories.items.length > 0) {
        new Setting(contentEl)
          .setName(this.t('publishModal_category'))
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
        .setButtonText(this.t('publishModal_publishButtonText'))
        .setCta()
        .onClick(() => {
          if (this.matterData.postType
            && this.matterData.postType !== PostTypeConst.Post
            && (this.matterData.tags || this.matterData.categories)
          ) {
            openConfirmModal({
              message: this.t('publishModal_wrongMatterDataForPage')
            }, this.plugin)
              .then(result => {
                if (result.code === ConfirmCode.Confirm) {
                  this.onSubmit(params, fm => {
                    delete fm.categories;
                    delete fm.tags;
                  });
                }
              });
          } else {
            this.onSubmit(params, fm => {});
          }
        })
      );
  }

}
