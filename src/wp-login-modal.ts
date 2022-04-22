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

    let password = '';
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
      .addText(text => text
        .onChange(async (value) => {
          password = value;
        }));
    new Setting(contentEl)
      .setName('Remember User Name')
      .setDesc(`If enabled, the WordPress user name you typed will be saved in local data.
This might be user name disclosure in synchronize services.`)
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.saveUserName)
          .onChange(async (value) => {
            this.plugin.settings.saveUserName = value;
            await this.plugin.saveSettings();
            if (!this.plugin.settings.saveUserName) {
              delete this.plugin.settings.userName;
            }
          }),
      );
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText('Login')
        .setCta()
        .onClick(() => {
          this.onSubmit(this.plugin.settings.userName, password, this);
        })
      );
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
