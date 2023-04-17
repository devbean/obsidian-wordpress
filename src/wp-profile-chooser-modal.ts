import { Modal, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WpProfile } from './wp-profile';
import { TranslateKey } from './i18n';
import { rendererProfile } from './utils';


export function openProfileChooserModal(
  plugin: WordpressPlugin
): Promise<WpProfile> {
  return new Promise<WpProfile>((resolve, reject) => {
    const modal = new WpProfileChooserModal(plugin, (profile) => {
      resolve(profile);
    });
    modal.open();
  });
}

/**
 * WordPress profiles chooser modal.
 */
class WpProfileChooserModal extends Modal {

  private readonly profiles: WpProfile[];

  constructor(
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

    contentEl.createEl('h1', { text: t('profilesChooserModal_title') });

    new Setting(contentEl)
      .setName(t('profilesChooserModal_pickOne'));
    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
