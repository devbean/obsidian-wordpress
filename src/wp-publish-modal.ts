import { App, Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WordPressPostParams } from './wp-client';
import { PostStatus, Term } from './wp-api';
import { toNumber } from 'lodash-es';
import { TranslateKey } from './i18n';

/**
 * WordPress publish modal.
 */
export class WpPublishModal extends Modal {

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly categories: Term[],
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
      categories: [ 1 ]
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
          .onChange(async (value: PostStatus) => {
            params.status = value;
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
            .setValue("1")
            .onChange(async (value: string) => {
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
