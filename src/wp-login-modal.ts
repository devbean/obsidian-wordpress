import { App, Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';

/**
 * WordPress login modal with user name and password inputs.
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
    const { contentEl } = this;

    contentEl.createEl('h1', { text: 'WordPress Login' });

    new Setting(contentEl)
      .setName('User Name')
      .setDesc(`User name for ${this.plugin.settings.endpoint}`)
      .addText(text => text
        .setValue(this.plugin.settings.userName ?? '')
        .onChange(async (value) => {
          if (this.plugin.settings.saveUserName) {
            this.plugin.settings.userName = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(contentEl)
      .setName('Password')
      .setDesc(`Password for ${this.plugin.settings.endpoint}`)
      .addText(text => text
        .setValue(this.plugin.settings.password ?? '')
        .onChange(async (value) => {
          if (this.plugin.settings.savePassword) {
            this.plugin.settings.password = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(contentEl)
      .setName('Remember User Name')
      .setDesc(`If enabled, the WordPress user name you typed will be saved in local data.
This might be disclosure in synchronize services.`)
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
      .setName('Remember Password')
      .setDesc(`If enabled, the WordPress password you typed will be saved in local data.
This might be disclosure in synchronize services.`)
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
        .setButtonText('Login')
        .setCta()
        .onClick(() => {
          this.onSubmit(this.plugin.settings.userName, this.plugin.settings.password, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
