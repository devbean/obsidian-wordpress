import { App, Modal } from 'obsidian';
import WordpressPlugin from './main';
import { WpProfile } from './wp-profile';
import { TranslateKey } from './i18n';
import { rendererProfile } from './utils';


/**
 * WordPress profiles chooser modal.
 */
export class WpProfileChooserModal extends Modal {

  private readonly profiles: WpProfile[];

  constructor(
    app: App,
    private readonly plugin: WordpressPlugin,
    private readonly onChoose: (profile: WpProfile) => void
  ) {
    super(app);

    this.profiles = plugin.settings.profiles;
  }

  onOpen() {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const chooseProfile = (profile: WpProfile): void => {
      this.onChoose(profile);
      this.close();
    }

    const renderProfiles = (): void => {
      content.empty();
      this.profiles.forEach((profile) => {
        const setting = rendererProfile(profile, content);
        setting.settingEl.addEventListener('click', () => {
          chooseProfile(profile);
        });
      });
    }

    const { contentEl } = this;

    contentEl.createEl('h1', { text: t('profilesManageModal_title') });

    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
