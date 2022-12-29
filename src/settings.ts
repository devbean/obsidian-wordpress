import { App, Notice, PluginSettingTab, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { CommentStatus, PostStatus } from './wp-api';
import { LanguageWithAuto, TranslateKey } from './i18n';
import { generateCodeVerifier, OAuth2Client, WordPressOAuth2Token } from './oauth2-client';
import { WordPressClientReturnCode } from './wp-client';
import { ERROR_NOTICE_TIMEOUT } from './consts';

const OAuth2UrlAction = 'wordpress-plugin-oauth';
const OAuth2RedirectUri = `obsidian://${OAuth2UrlAction}`;

export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI_miniOrange = 'miniOrange',
  RestApi_ApplicationPasswords = 'application-passwords',
  RestApi_WpComOAuth2 = 'WpComOAuth2'
}

export interface WordpressPluginSettings {

  /**
   * Plugin language.
   */
  lang: LanguageWithAuto;

  /**
   * API type.
   */
  apiType: ApiType;

  /**
   * Endpoint.
   */
  endpoint: string;

  /**
   * XML-RPC path.
   */
  xmlRpcPath: string;

  /**
   * WordPress username.
   */
  username?: string;

  /**
   * WordPress password.
   */
  password?: string;

  wpComOAuth2Token?: WordPressOAuth2Token;

  /**
   * Save username to local data.
   */
  saveUsername: boolean;

  /**
   * Save user password to local data.
   */
  savePassword: boolean;

  /**
   * Show plugin icon in side.
   */
  showRibbonIcon: boolean;

  /**
   * Default post status.
   */
  defaultPostStatus: PostStatus;

  /**
   * Default comment status.
   */
  defaultCommentStatus: CommentStatus;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  lang: 'auto',
  apiType: ApiType.XML_RPC,
  endpoint: '',
  xmlRpcPath: '/xmlrpc.php',
  saveUsername: false,
  savePassword: false,
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft,
  defaultCommentStatus: CommentStatus.Open
}

export class WordpressSettingTab extends PluginSettingTab {

  private readonly client = new OAuth2Client({
    clientId: '79085',
    clientSecret: 'zg4mKy9O1mc1mmynShJTVxs8r1k3X4e3g1sv5URlkpZqlWdUdAA7C2SSBOo02P7X',
    tokenEndpoint: 'https://public-api.wordpress.com/oauth2/token',
    authorizeEndpoint: 'https://public-api.wordpress.com/oauth2/authorize',
    validateTokenEndpoint: 'https://public-api.wordpress.com/oauth2/token-info'
  }, this.plugin);

  private codeVerifier?: string;

	constructor(
    app: App,
    private readonly plugin: WordpressPlugin
  ) {
		super(app, plugin);

    this.plugin.registerObsidianProtocolHandler(OAuth2UrlAction, async (e) => {
      if (e.action === OAuth2UrlAction) {
        if (e.state) {
          if (e.error) {
            new Notice(plugin.i18n.t('error_wpComAuthFailed', {
              error: e.error,
              desc: e.error_description.replace(/\+/g,' ')
            }), 0);
            delete this.plugin.settings.wpComOAuth2Token;
            await this.plugin.saveSettings();
          } else if (e.code) {
            const token = await this.client.getToken({
              code: e.code,
              redirectUri: OAuth2RedirectUri,
              codeVerifier: this.codeVerifier
            });
            console.log(token);
            this.plugin.settings.wpComOAuth2Token = token;
            await this.plugin.saveSettings();
          }
        }
      }
    });
	}

	display(): void {
    const t = (key: TranslateKey, vars?: Record<string, string>): string => {
      return this.plugin.i18n.t(key, vars);
    };
    const getApiTypeDesc = (apiType: ApiType): string => {
      switch (apiType) {
        case ApiType.XML_RPC:
          return t('settings_apiTypeXmlRpcDesc');
        case ApiType.RestAPI_miniOrange:
          return t('settings_apiTypeRestMiniOrangeDesc');
        case ApiType.RestApi_ApplicationPasswords:
          return t('settings_apiTypeRestApplicationPasswordsDesc');
        case ApiType.RestApi_WpComOAuth2:
          return t('settings_apiTypeRestWpComOAuth2Desc');
        default:
          return '';
      }
    };

		const { containerEl } = this;

		containerEl.empty();

    containerEl.createEl('h1', { text: t('settings_title') });

    let apiDesc = getApiTypeDesc(this.plugin.settings.apiType);

		new Setting(containerEl)
			.setName(t('settings_url'))
			.setDesc(t('settings_urlDesc'))
			.addText(text => text
				.setPlaceholder(t('settings_urlPlaceholder'))
				.setValue(this.plugin.settings.endpoint)
				.onChange(async (value) => {
          if (this.plugin.settings.endpoint !== value) {
            this.plugin.settings.endpoint = value;
            await this.plugin.saveSettings();
          }
        }));
    new Setting(containerEl)
      .setName(t('settings_apiType'))
      .setDesc(t('settings_apiTypeDesc'))
      .addDropdown((dropdown) => {
        dropdown
          .addOption(ApiType.XML_RPC, t('settings_apiTypeXmlRpc'))
          .addOption(ApiType.RestAPI_miniOrange, t('settings_apiTypeRestMiniOrange'))
          .addOption(ApiType.RestApi_ApplicationPasswords, t('settings_apiTypeRestApplicationPasswords'))
          .addOption(ApiType.RestApi_WpComOAuth2, t('settings_apiTypeRestWpComOAuth2'))
          .setValue(this.plugin.settings.apiType)
          .onChange(async (value: ApiType) => {
            let hasError = false;
            let newApiType = value;
            if (value === ApiType.RestApi_WpComOAuth2) {
              if (!this.plugin.settings.endpoint.includes('wordpress.com')) {
                new Notice(t('error_notWpCom'), ERROR_NOTICE_TIMEOUT);
                hasError = true;
                newApiType = this.plugin.settings.apiType;
              }
            }
            this.plugin.settings.apiType = newApiType;
            apiDesc = getApiTypeDesc(this.plugin.settings.apiType);
            await this.plugin.saveSettings();
            this.display();
            if (!hasError) {
              if (value === ApiType.RestApi_WpComOAuth2) {
                if (this.plugin.settings.wpComOAuth2Token) {
                  const endpointUrl = new URL(this.plugin.settings.endpoint);
                  const blogUrl = new URL(this.plugin.settings.wpComOAuth2Token.blogUrl);
                  if (endpointUrl.host !== blogUrl.host) {
                    await this.refreshWpComToken();
                  }
                } else {
                  await this.refreshWpComToken();
                }
              }
            }
          });
      });
    containerEl.createEl('p', {
      text: apiDesc,
      cls: 'setting-item-description'
    });
    if (this.plugin.settings.apiType === ApiType.XML_RPC) {
      new Setting(containerEl)
        .setName(t('settings_xmlRpcPath'))
        .setDesc(t('settings_xmlRpcPathDesc'))
        .addText(text => text
          .setPlaceholder('/xmlrpc.php')
          .setValue(this.plugin.settings.xmlRpcPath)
          .onChange(async (value) => {
            this.plugin.settings.xmlRpcPath = value;
            await this.plugin.saveSettings();
          }));
    } else if (this.plugin.settings.apiType === ApiType.RestApi_WpComOAuth2) {
      new Setting(containerEl)
        .setName(t('settings_wpComOAuth2RefreshToken'))
        .setDesc(t('settings_wpComOAuth2RefreshTokenDesc'))
        .addButton(button => button
          .setButtonText(t('settings_wpComOAuth2ValidateTokenButtonText'))
          .onClick(() => {
            if (this.plugin.settings.wpComOAuth2Token) {
              this.client.validateToken({
                token: this.plugin.settings.wpComOAuth2Token.accessToken
              })
                .then(result => {
                  if (result.code === WordPressClientReturnCode.Error) {
                    new Notice(result.data + '', ERROR_NOTICE_TIMEOUT);
                  } else {
                    new Notice(t('message_wpComTokenValidated'));
                  }
                });
            }
          }))
        .addButton(button => button
          .setButtonText(t('settings_wpComOAuth2RefreshTokenButtonText'))
          .onClick(async () => {
            await this.refreshWpComToken();
          }));
    }
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
          .onChange(async (value: PostStatus) => {
            this.plugin.settings.defaultPostStatus = value;
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
          .onChange(async (value: CommentStatus) => {
            this.plugin.settings.defaultCommentStatus = value;
            await this.plugin.saveSettings();
          });
      });
	}

  private async refreshWpComToken(): Promise<void> {
    this.codeVerifier = generateCodeVerifier();
    await this.client.getAuthorizeCode({
      redirectUri: OAuth2RedirectUri,
      scope: [ 'posts', 'taxonomy', 'media' ],
      blog: this.plugin.settings.endpoint,
      codeVerifier: this.codeVerifier
    });
  }

}
