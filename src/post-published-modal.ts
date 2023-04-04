import { App, Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';

/**
 * WordPress post published modal.
 */
export class PostPublishedModal extends Modal {

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly onOpenClicked: (modal: Modal) => void
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('publishedModal_title') });

    new Setting(contentEl)
      .setName(t('publishedModal_confirmEditInWP'));
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('publishedModal_cancel'))
        .onClick(() => {
          this.close();
        })
      )
      .addButton(button => button
        .setButtonText(t('publishedModal_open'))
        .setCta()
        .onClick(() => {
          this.onOpenClicked(this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
