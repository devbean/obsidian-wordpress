import { App, Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';

/**
 * WordPress login modal with username and password inputs.
 */
export class WpLoginModal extends Modal {

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly onSubmit: (userName: string, password: string, modal: Modal) => void
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('loginModal_title') });

    new Setting(contentEl)
      .setName(t('loginModal_username'))
      .setDesc(t('loginModal_usernameDesc', { url: this.plugin.settings.endpoint }))
      .addText(text => text
        .setValue(this.plugin.settings.userName ?? '')
        .onChange(async (value) => {
          if (this.plugin.settings.saveUserName) {
            this.plugin.settings.userName = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(contentEl)
      .setName(t('loginModal_password'))
      .setDesc(t('loginModal_passwordDesc', { url: this.plugin.settings.endpoint }))
      .addText(text => text
        .setValue(this.plugin.settings.password ?? '')
        .onChange(async (value) => {
          if (this.plugin.settings.savePassword) {
            this.plugin.settings.password = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(contentEl)
      .setName(t('loginModal_rememberUsername'))
      .setDesc(t('loginModal_rememberUsernameDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.saveUserName)
          .onChange(async (value) => {
            this.plugin.settings.saveUserName = value;
            if (!this.plugin.settings.saveUserName) {
              delete this.plugin.settings.userName;
            }
            await this.plugin.saveSettings();
          }),
      );
    new Setting(contentEl)
      .setName(t('loginModal_rememberPassword'))
      .setDesc(t('loginModal_rememberPasswordDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.savePassword)
          .onChange(async (value) => {
            this.plugin.settings.savePassword = value;
            if (!this.plugin.settings.savePassword) {
              delete this.plugin.settings.password;
            }
            await this.plugin.saveSettings();
          }),
      );
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('loginModal_loginButtonText'))
        .setCta()
        .onClick(() => {
          this.onSubmit(this.plugin.settings.userName!, this.plugin.settings.password!, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
