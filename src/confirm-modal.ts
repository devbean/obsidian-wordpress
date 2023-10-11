import { Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';


export enum ConfirmCode {
  Cancel,
  Confirm
}

export interface ConfirmModalMessages {
  message: string;
  cancelText?: string;
  confirmText?: string;
}

export function openConfirmModal(
  messages: ConfirmModalMessages,
  plugin: WordpressPlugin
): Promise<{ code: ConfirmCode }> {
  return new Promise((resolve, reject) => {
    const modal = new ConfirmModal(
      messages,
      plugin,
      (code, modal) => {
        resolve({
          code
        });
        modal.close();
      });
    modal.open();
  });
}

/**
 * Confirm modal.
 */
class ConfirmModal extends Modal {

  constructor(
    private readonly messages: ConfirmModalMessages,
    private readonly plugin: WordpressPlugin,
    private readonly onAction: (code: ConfirmCode, modal: Modal) => void
  ) {
    super(plugin.app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('confirmModal_title') });

    new Setting(contentEl)
      .setName(this.messages.message);

    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(this.messages.cancelText ?? t('confirmModal_cancel'))
        .onClick(() => {
          this.onAction(ConfirmCode.Cancel, this);
        })
      )
      .addButton(button => button
        .setButtonText(this.messages.confirmText ?? t('confirmModal_confirm'))
        .setCta()
        .onClick(() => {
          this.onAction(ConfirmCode.Confirm, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
