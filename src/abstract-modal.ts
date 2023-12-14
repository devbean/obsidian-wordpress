import { Modal, Platform } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';

export abstract class AbstractModal extends Modal {

  protected constructor(
    protected readonly plugin: WordpressPlugin
  ) {
    super(plugin.app);
  }

  protected t(key: TranslateKey, vars?: Record<string, string>): string {
    return this.plugin.i18n.t(key, vars);
  }

  protected createHeader(title: string): void {
    const { contentEl } = this;

    const headerDiv = contentEl.createDiv();
    headerDiv.addClass('modal-header');
    headerDiv.createEl('h1', { text: title });
    if (Platform.isMobile) {
      const backButton = headerDiv.createEl('button', { text: this.t('common_back') });
      backButton.addEventListener('click', () => {
        this.close();
      });
    }
  }

}
