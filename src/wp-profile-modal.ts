import { Notice, Setting } from 'obsidian';
import WordpressPlugin from './main';
import { WpProfile } from './wp-profile';
import { EventType, WP_OAUTH2_REDIRECT_URI } from './consts';
import { WordPressClientReturnCode } from './wp-client';
import { generateCodeVerifier, OAuth2Client, WordPressOAuth2Token } from './oauth2-client';
import { AppState } from './app-state';
import { isValidUrl, SafeAny, showError } from './utils';
import { ApiType } from './plugin-settings';
import { AbstractModal } from './abstract-modal';
import { Logger } from './logger';

export function openProfileModal(
  plugin: WordpressPlugin,
  profile: WpProfile = {
    name: '',
    apiType: ApiType.XML_RPC,
    endpoint: '',
    xmlRpcPath: '/xmlrpc.php',
    saveUsername: false,
    savePassword: false,
    isDefault: false,
    lastSelectedCategories: [ 1 ],
  },
  atIndex = -1
): Promise<{ profile: WpProfile, atIndex?: number }> {
  return new Promise((resolve, reject) => {
    const modal = new WpProfileModal(plugin, (profile, atIndex) => {
      resolve({
        profile,
        atIndex
      });
    }, profile, atIndex);
    modal.open();
  });
}

/**
 * WordPress profile modal.
 */
class WpProfileModal extends AbstractModal {

  private readonly profileData: WpProfile;

  private readonly tokenGotRef;

  constructor(
    readonly plugin: WordpressPlugin,
    private readonly onSubmit: (profile: WpProfile, atIndex?: number) => void,
    private readonly profile: WpProfile = {
      name: '',
      apiType: ApiType.XML_RPC,
      endpoint: '',
      xmlRpcPath: '/xmlrpc.php',
      saveUsername: false,
      savePassword: false,
      isDefault: false,
      lastSelectedCategories: [ 1 ],
    },
    private readonly atIndex: number = -1
  ) {
    super(plugin);

    this.profileData = Object.assign({}, profile);
    this.tokenGotRef = AppState.events.on(EventType.OAUTH2_TOKEN_GOT, async token=> {
      const tokenData = token as WordPressOAuth2Token;
      this.#onTokenGot(tokenData);
      if (atIndex >= 0) {
        // if token is undefined, just remove it
        this.plugin.settings.profiles[atIndex].wpComOAuth2Token = tokenData;
        await this.plugin.saveSettings();
      }
    });
  }

  #onTokenGot = (tokenData: SafeAny) => {
    Logger.log('WpProfileModal.onTokenGot', tokenData);
    if (tokenData) {
      this.profile.wpComOAuth2Token = tokenData;
      this.close();
      this.onSubmit?.(this.profile, this.atIndex);
    }
  }

  onOpen() {
    const getApiTypeDesc = (apiType: ApiType): string => {
      switch (apiType) {
        case ApiType.XML_RPC:
          return this.t('settings_apiTypeXmlRpcDesc');
        case ApiType.RestAPI_miniOrange:
          return this.t('settings_apiTypeRestMiniOrangeDesc');
        case ApiType.RestApi_ApplicationPasswords:
          return this.t('settings_apiTypeRestApplicationPasswordsDesc');
        case ApiType.RestApi_WpComOAuth2:
          return this.t('settings_apiTypeRestWpComOAuth2Desc');
        default:
          return '';
      }
    };
    let apiDesc = getApiTypeDesc(this.profileData.apiType);

    const renderProfile = () => {
      content.empty();

      new Setting(content)
        .setName(this.t('profileModal_name'))
        .setDesc(this.t('profileModal_nameDesc'))
        .addText(text => text
          .setPlaceholder('Profile name')
          .setValue(this.profileData.name ?? '')
          .onChange((value) => {
            this.profileData.name = value;
          })
        );
      new Setting(content)
        .setName(this.t('settings_url'))
        .setDesc(this.t('settings_urlDesc'))
        .addText(text => text
          .setPlaceholder(this.t('settings_urlPlaceholder'))
          .setValue(this.profileData.endpoint)
          .onChange((value) => {
            if (this.profileData.endpoint !== value) {
              this.profileData.endpoint = value;
            }
          }));
      new Setting(content)
        .setName(this.t('settings_apiType'))
        .setDesc(this.t('settings_apiTypeDesc'))
        .addDropdown((dropdown) => {
          dropdown
            .addOption(ApiType.XML_RPC, this.t('settings_apiTypeXmlRpc'))
            .addOption(ApiType.RestAPI_miniOrange, this.t('settings_apiTypeRestMiniOrange'))
            .addOption(ApiType.RestApi_ApplicationPasswords, this.t('settings_apiTypeRestApplicationPasswords'))
            .addOption(ApiType.RestApi_WpComOAuth2, this.t('settings_apiTypeRestWpComOAuth2'))
            .setValue(this.profileData.apiType)
            .onChange(async (value) => {
              let hasError = false;
              let newApiType = value;
              if (value === ApiType.RestApi_WpComOAuth2) {
                if (!this.profileData.endpoint.includes('wordpress.com')) {
                  showError(this.t('error_notWpCom'));
                  hasError = true;
                  newApiType = this.profileData.apiType;
                }
              }
              this.profileData.apiType = newApiType as ApiType;
              apiDesc = getApiTypeDesc(this.profileData.apiType);
              renderProfile();
              if (!hasError) {
                if (value === ApiType.RestApi_WpComOAuth2) {
                  if (this.profileData.wpComOAuth2Token) {
                    const endpointUrl = new URL(this.profileData.endpoint);
                    const blogUrl = new URL(this.profileData.wpComOAuth2Token.blogUrl);
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
      content.createEl('p', {
        text: apiDesc,
        cls: 'setting-item-description'
      });
      if (this.profileData.apiType === ApiType.XML_RPC) {
        new Setting(content)
          .setName(this.t('settings_xmlRpcPath'))
          .setDesc(this.t('settings_xmlRpcPathDesc'))
          .addText(text => text
            .setPlaceholder('/xmlrpc.php')
            .setValue(this.profileData.xmlRpcPath ?? '')
            .onChange((value) => {
              this.profileData.xmlRpcPath = value;
            }));
      } else if (this.profileData.apiType === ApiType.RestApi_WpComOAuth2) {
        new Setting(content)
          .setName(this.t('settings_wpComOAuth2RefreshToken'))
          .setDesc(this.t('settings_wpComOAuth2RefreshTokenDesc'))
          .addButton(button => button
            .setButtonText(this.t('settings_wpComOAuth2ValidateTokenButtonText'))
            .onClick(() => {
              if (this.profileData.wpComOAuth2Token) {
                OAuth2Client.getWpOAuth2Client(this.plugin).validateToken({
                  token: this.profileData.wpComOAuth2Token.accessToken
                })
                  .then(result => {
                    if (result.code === WordPressClientReturnCode.Error) {
                      showError(result.error?.message + '');
                    } else {
                      new Notice(this.t('message_wpComTokenValidated'));
                    }
                  });
              }
            }))
          .addButton(button => button
            .setButtonText(this.t('settings_wpComOAuth2RefreshTokenButtonText'))
            .onClick(async () => {
              await this.refreshWpComToken();
            }));
      }

      if (this.profileData.apiType !== ApiType.RestApi_WpComOAuth2) {
        const usernameSetting = new Setting(content)
          .setName(this.t('profileModal_rememberUsername'));
        if (this.profileData.saveUsername) {
          usernameSetting
            .addText(text => text
              .setValue(this.profileData.username ?? '')
              .onChange((value) => {
                this.profileData.username = value;
              })
            );
        }
        usernameSetting.addToggle(toggle => toggle
          .setValue(this.profileData.saveUsername)
          .onChange(save => {
            this.profileData.saveUsername = save;
            renderProfile();
          })
        );
        const passwordSetting = new Setting(content)
          .setName(this.t('profileModal_rememberPassword'));
        if (this.profileData.savePassword) {
          passwordSetting
            .addText(text => text
              .setValue(this.profileData.password ?? '')
              .onChange((value) => {
                this.profileData.password = value;
              })
            );
        }
        passwordSetting.addToggle(toggle => toggle
          .setValue(this.profileData.savePassword)
          .onChange(save => {
            this.profileData.savePassword = save;
            renderProfile();
          })
        );
      }
      new Setting(content)
        .setName(this.t('profileModal_setDefault'))
        .addToggle(toggle => toggle
          .setValue(this.profileData.isDefault)
          .onChange((value) => {
            this.profileData.isDefault = value;
          })
        );

      new Setting(content)
        .addButton(button => button
          .setButtonText(this.t('profileModal_Save'))
          .setCta()
          .onClick(() => {
            if (!isValidUrl(this.profileData.endpoint)) {
              showError(this.t('error_invalidUrl'));
            } else if (this.profileData.name.length === 0) {
              showError(this.t('error_noProfileName'));
            } else if (this.profileData.saveUsername && !this.profileData.username) {
              showError(this.t('error_noUsername'));
            } else if (this.profileData.savePassword && !this.profileData.password) {
              showError(this.t('error_noPassword'));
            } else {
              this.onSubmit(this.profileData, this.atIndex);
              this.close();
            }
          })
        );
    }

    this.createHeader(this.t('profileModal_title'));

    const { contentEl } = this;

    const content = contentEl.createEl('div');
    renderProfile();
  }

  onClose() {
    if (this.tokenGotRef) {
      AppState.events.offref(this.tokenGotRef);
    }
    const { contentEl } = this;
    contentEl.empty();
  }

  private async refreshWpComToken(): Promise<void> {
    AppState.codeVerifier = generateCodeVerifier();
    await OAuth2Client.getWpOAuth2Client(this.plugin).getAuthorizeCode({
      redirectUri: WP_OAUTH2_REDIRECT_URI,
      scope: [ 'posts', 'taxonomy', 'media', 'sites' ],
      blog: this.profileData.endpoint,
      codeVerifier: AppState.codeVerifier
    });
  }

}
