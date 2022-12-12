import { App, Modal, Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';

/**
 * WordPress login modal with username and password inputs.
 */
export class WpLoginModal extends Modal {

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly onSubmit: (username: string, password: string, modal: Modal) => void
  ) {
    super(app);
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('loginModal_title') });

    let username = '';
    let password = '';
    new Setting(contentEl)
      .setName(t('loginModal_username'))
      .setDesc(t('loginModal_usernameDesc', { url: this.plugin.settings.endpoint }))
      .addText(text => text
        .setValue(this.plugin.settings.username ?? '')
        .onChange(async (value) => {
          username = value;
          if (this.plugin.settings.saveUsername) {
            this.plugin.settings.username = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(contentEl)
      .setName(t('loginModal_password'))
      .setDesc(t('loginModal_passwordDesc', { url: this.plugin.settings.endpoint }))
      .addText(text => text
        .setValue(this.plugin.settings.password ?? '')
        .onChange(async (value) => {
          password = value;
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
          .setValue(this.plugin.settings.saveUsername)
          .onChange(async (value) => {
            this.plugin.settings.saveUsername = value;
            if (!this.plugin.settings.saveUsername) {
              delete this.plugin.settings.username;
            } else {
              this.plugin.settings.username = username;
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
            } else {
              this.plugin.settings.password = password;
            }
            await this.plugin.saveSettings();
          }),
      );
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('loginModal_loginButtonText'))
        .setCta()
        .onClick(() => {
          if (!username) {
            new Notice(t('error_noUsername'));
          }
          if (!password) {
            new Notice(t('error_noPassword'));
          }
          if (username && password) {
            this.onSubmit(username, password, this);
          }
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
