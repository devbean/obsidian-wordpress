import WordpressPlugin from './main';
import { WpProfile } from './wp-profile';
import { rendererProfile } from './utils';
import { AbstractModal } from './abstract-modal';


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
class WpProfileChooserModal extends AbstractModal {

  private readonly profiles: WpProfile[];

  constructor(
    readonly plugin: WordpressPlugin,
    private readonly onChoose: (profile: WpProfile) => void
  ) {
    super(plugin);

    this.profiles = plugin.settings.profiles;
  }

  onOpen() {
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

    this.createHeader(this.t('profilesChooserModal_title'));

    const { contentEl } = this;
    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
