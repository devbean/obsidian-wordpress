import { PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { TranslateKey } from './i18n';
import { WpProfileManageModal } from './wp-profile-manage-modal';
import { MathJaxOutputType } from './plugin-settings';
import { WpProfile } from './wp-profile';
import { setupMarkdownParser } from './utils';
import { AppState } from './app-state';


export class WordpressSettingTab extends PluginSettingTab {

	constructor(
    private readonly plugin: WordpressPlugin
  ) {
		super(plugin.app, plugin);
	}

	display(): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };

    const getMathJaxOutputTypeDesc = (type: MathJaxOutputType): string => {
      switch (type) {
        case MathJaxOutputType.TeX:
          return t('settings_MathJaxOutputTypeTeXDesc');
        case MathJaxOutputType.SVG:
          return t('settings_MathJaxOutputTypeSVGDesc');
        default:
          return '';
      }
    }

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);

    new Setting(containerEl)
      .setName(t('settings_profiles'))
      .setDesc(t('settings_profilesDesc'))
      .addButton(button => button
        .setButtonText(t('settings_profilesModal'))
        .onClick(() => {
          new WpProfileManageModal(this.plugin).open();
        }));

    new Setting(containerEl)
      .setName(t('settings_showRibbonIcon'))
      .setDesc(t('settings_showRibbonIconDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showRibbonIcon)
          .onChange(async (value) => {
            this.plugin.settings.showRibbonIcon = value;
            await this.plugin.saveSettings();

            this.plugin.updateRibbonIcon();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_defaultPostStatus'))
      .setDesc(t('settings_defaultPostStatusDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(PostStatus.Draft, t('settings_defaultPostStatusDraft'))
          .addOption(PostStatus.Publish, t('settings_defaultPostStatusPublish'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultPostStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultPostStatus = value as PostStatus;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_defaultPostComment'))
      .setDesc(t('settings_defaultPostCommentDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentStatus.Open, t('settings_defaultPostCommentOpen'))
          .addOption(CommentStatus.Closed, t('settings_defaultPostCommentClosed'))
          // .addOption(PostStatus.Future, 'future')
          .setValue(this.plugin.settings.defaultCommentStatus)
          .onChange(async (value) => {
            this.plugin.settings.defaultCommentStatus = value as CommentStatus;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName(t('settings_rememberLastSelectedCategories'))
      .setDesc(t('settings_rememberLastSelectedCategoriesDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.rememberLastSelectedCategories)
          .onChange(async (value) => {
            this.plugin.settings.rememberLastSelectedCategories = value;
            if (!value) {
              this.plugin.settings.profiles.forEach((profile: WpProfile) => {
                if (!profile.lastSelectedCategories || profile.lastSelectedCategories.length === 0) {
                  profile.lastSelectedCategories = [ 1 ];
                }
              });
            }
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_showWordPressEditPageModal'))
      .setDesc(t('settings_showWordPressEditPageModalDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showWordPressEditConfirm)
          .onChange(async (value) => {
            this.plugin.settings.showWordPressEditConfirm = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_mathJaxOutputType'))
      .setDesc(t('settings_mathJaxOutputTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(MathJaxOutputType.TeX, t('settings_mathJaxOutputTypeTeX'))
          .addOption(MathJaxOutputType.SVG, t('settings_mathJaxOutputTypeSVG'))
          .setValue(this.plugin.settings.mathJaxOutputType)
          .onChange(async (value) => {
            this.plugin.settings.mathJaxOutputType = value as MathJaxOutputType;
            mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);
            await this.plugin.saveSettings();
            this.display();

            setupMarkdownParser(this.plugin.settings);
          });
      });
    containerEl.createEl('p', {
      text: mathJaxOutputTypeDesc,
      cls: 'setting-item-description'
    });

    new Setting(containerEl)
      .setName(t('settings_enableHtml'))
      .setDesc(t('settings_enableHtmlDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableHtml)
          .onChange(async (value) => {
            this.plugin.settings.enableHtml = value;
            await this.plugin.saveSettings();

            AppState.getInstance().markdownParser.set({
              html: this.plugin.settings.enableHtml
            });
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_replaceMediaLinks'))
      .setDesc(t('settings_replaceMediaLinksDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.replaceMediaLinks)
          .onChange(async (value) => {
            this.plugin.settings.replaceMediaLinks = value;
            await this.plugin.saveSettings();
          }),
      );
	}

}
