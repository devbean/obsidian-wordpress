import { Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WpProfile } from './wp-profile';
import { openProfileModal } from './wp-profile-modal';
import { isNil } from 'lodash-es';
import { rendererProfile } from './utils';
import { AbstractModal } from './abstract-modal';
import { Logger } from './logger';

/**
 * WordPress profiles manage modal.
 */
export class WpProfileManageModal extends AbstractModal {

  private readonly profiles: WpProfile[];

  constructor(
    readonly plugin: WordpressPlugin
  ) {
    super(plugin);

    this.profiles = plugin.settings.profiles;
  }

  onOpen() {
    const renderProfiles = (): void => {
      content.empty();
      this.profiles.forEach((profile, index) => {
        const setting = rendererProfile(profile, content);
        if (!profile.isDefault) {
          setting
            .addButton(button => button
              .setButtonText(this.t('profilesManageModal_setDefault'))
              .onClick(() => {
                this.profiles.forEach(it => it.isDefault = false);
                profile.isDefault = true;
                renderProfiles();
                this.plugin.saveSettings().then();
              }));
        }
        setting.addButton(button => button
          .setButtonText(this.t('profilesManageModal_showDetails'))
          .onClick(async () => {
            const { profile: newProfile, atIndex } = await openProfileModal(
              this.plugin,
              profile,
              index
            );
            Logger.log('updateProfile', newProfile, atIndex);
            if (!isNil(atIndex) && atIndex > -1) {
              if (newProfile.isDefault) {
                this.profiles.forEach(it => it.isDefault = false);
              }
              this.profiles[atIndex] = newProfile;
              renderProfiles();
              this.plugin.saveSettings().then();
            }
          }));
        setting.addExtraButton(button => button
          .setIcon('lucide-trash')
          .setTooltip(this.t('profilesManageModal_deleteTooltip'))
          .onClick(() => {
            this.profiles.splice(index, 1);
            if (profile.isDefault) {
              if (this.profiles.length > 0) {
                this.profiles[0].isDefault = true;
              }
            }
            renderProfiles();
            this.plugin.saveSettings().then();
          }));
      });
    }

    this.createHeader(this.t('profilesManageModal_title'));

    const { contentEl } = this;
    new Setting(contentEl)
      .setName(this.t('profilesManageModal_create'))
      .setDesc(this.t('profilesManageModal_createDesc'))
      .addButton(button => button
        .setButtonText(this.t('profilesManageModal_create'))
        .setCta()
        .onClick(async () => {
          const { profile } = await openProfileModal(
            this.plugin
          );
          Logger.log('appendProfile', profile);
          // if no profile, make the first one default
          if (this.profiles.length === 0) {
            profile.isDefault = true;
          }
          if (profile.isDefault) {
            this.profiles.forEach(it => it.isDefault = false);
          }
          this.profiles.push(profile);
          renderProfiles();
          await this.plugin.saveSettings();
        }));

    const content = contentEl.createEl('div');
    renderProfiles();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }

}
