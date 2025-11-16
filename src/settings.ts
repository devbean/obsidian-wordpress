import { PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { TranslateKey } from './i18n';
import { WpProfileManageModal } from './wp-profile-manage-modal';
import { CommentConvertMode, MathJaxOutputType } from './plugin-settings';
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

    const getCommentConvertModeDesc = (type: CommentConvertMode): string => {
      switch (type) {
        case CommentConvertMode.Ignore:
          return t('settings_commentConvertModeIgnoreDesc');
        case CommentConvertMode.HTML:
          return t('settings_commentConvertModeHTMLDesc');
        default:
          return '';
      }
    }

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    let mathJaxOutputTypeDesc = getMathJaxOutputTypeDesc(this.plugin.settings.mathJaxOutputType);
    let commentConvertModeDesc = getCommentConvertModeDesc(this.plugin.settings.commentConvertMode);

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
          .addOption(PostStatus.Private, t('settings_defaultPostStatusPrivate'))
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
      .setName(t('settings_commentConvertMode'))
      .setDesc(t('settings_commentConvertModeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(CommentConvertMode.Ignore, t('settings_commentConvertModeIgnore'))
          .addOption(CommentConvertMode.HTML, t('settings_commentConvertModeHTML'))
          .setValue(this.plugin.settings.commentConvertMode)
          .onChange(async (value) => {
            this.plugin.settings.commentConvertMode = value as CommentConvertMode;
            commentConvertModeDesc = getCommentConvertModeDesc(this.plugin.settings.commentConvertMode);
            await this.plugin.saveSettings();
            this.display();

            setupMarkdownParser(this.plugin.settings);
          });
      });
    containerEl.createEl('p', {
      text: commentConvertModeDesc,
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

            AppState.markdownParser.set({
              html: this.plugin.settings.enableHtml
            });
          }),
      );

    new Setting(containerEl)
      .setName(t('settings_uploadRawMarkdown'))
      .setDesc(t('settings_uploadRawMarkdownDesc'))
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.uploadRawMarkdown)
          .onChange(async (value) => {
            this.plugin.settings.uploadRawMarkdown = value;
            await this.plugin.saveSettings();
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
