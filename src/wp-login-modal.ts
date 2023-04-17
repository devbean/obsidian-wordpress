import { Modal, Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { TranslateKey } from './i18n';
import { ERROR_NOTICE_TIMEOUT } from './consts';
import { WpProfile } from './wp-profile';

export function openLoginModal(
  plugin: WordpressPlugin,
  profile: WpProfile
): Promise<{ username: string, password: string, loginModal: Modal }> {
  return new Promise((resolve, reject) => {
    const modal = new WpLoginModal(plugin, profile, (username, password, loginModal) => {
      resolve({
        username,
        password,
        loginModal
      });
    });
    modal.open();
  });
}

/**
 * WordPress login modal with username and password inputs.
 */
class WpLoginModal extends Modal {

  constructor(
    private readonly plugin: WordpressPlugin,
    private readonly profile: WpProfile,
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

    let username = this.profile.username;
    let password = this.profile.password;
    new Setting(contentEl)
      .setName(t('loginModal_username'))
      .setDesc(t('loginModal_usernameDesc', { url: this.profile.endpoint }))
      .addText(text => {
        text
          .setValue(this.profile.username ?? '')
          .onChange(async (value) => {
            username = value;
            if (this.profile.saveUsername) {
              this.profile.username = value;
              await this.plugin.saveSettings();
            }
          });
        if (!this.profile.saveUsername) {
          setTimeout(() => {
            text.inputEl.focus();
          });
        }
      });
    new Setting(contentEl)
      .setName(t('loginModal_password'))
      .setDesc(t('loginModal_passwordDesc', { url: this.profile.endpoint }))
      .addText(text => {
        text
          .setValue(this.profile.password ?? '')
          .onChange(async (value) => {
            password = value;
            if (this.profile.savePassword) {
              this.profile.password = value;
              await this.plugin.saveSettings();
            }
          });
        if (this.profile.saveUsername) {
          setTimeout(() => {
            text.inputEl.focus();
          });
        }
      });
    // new Setting(contentEl)
    //   .setName(t('loginModal_rememberUsername'))
    //   .setDesc(t('loginModal_rememberUsernameDesc'))
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.profile.saveUsername)
    //       .onChange(async (value) => {
    //         this.profile.saveUsername = value;
    //         if (!this.profile.saveUsername) {
    //           delete this.profile.username;
    //         } else {
    //           this.profile.username = username;
    //         }
    //         await this.plugin.saveSettings();
    //       }),
    //   );
    // new Setting(contentEl)
    //   .setName(t('loginModal_rememberPassword'))
    //   .setDesc(t('loginModal_rememberPasswordDesc'))
    //   .addToggle((toggle) =>
    //     toggle
    //       .setValue(this.profile.savePassword)
    //       .onChange(async (value) => {
    //         this.profile.savePassword = value;
    //         if (!this.profile.savePassword) {
    //           delete this.profile.password;
    //         } else {
    //           this.profile.password = password;
    //         }
    //         await this.plugin.saveSettings();
    //       }),
    //   );
    new Setting(contentEl)
      .addButton(button => button
        .setButtonText(t('loginModal_loginButtonText'))
        .setCta()
        .onClick(() => {
          if (!username) {
            new Notice(t('error_noUsername'), ERROR_NOTICE_TIMEOUT);
          } else if (!password) {
            new Notice(t('error_noPassword'), ERROR_NOTICE_TIMEOUT);
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
