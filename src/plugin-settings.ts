import { LanguageWithAuto } from './i18n';
import { WpProfile } from './wp-profile';
import { CommentStatus, PostStatus } from './wp-api';
import { isNil, isUndefined } from 'lodash-es';
import { SafeAny } from './utils';
import { PassCrypto } from './pass-crypto';
import { WP_DEFAULT_PROFILE_NAME } from './consts';


export const enum SettingsVersion {
  V2 = '2'
}

export const enum ApiType {
  XML_RPC = 'xml-rpc',
  RestAPI_miniOrange = 'miniOrange',
  RestApi_ApplicationPasswords = 'application-passwords',
  RestApi_WpComOAuth2 = 'WpComOAuth2'
}

export const enum MathJaxOutputType {
  TeX = 'tex',
  SVG = 'svg'
}

export const enum CommentConvertMode {
  Ignore = 'ignore',
  HTML = 'html'
}

export interface WordpressPluginSettings {

  version?: SettingsVersion;

  /**
   * Plugin language.
   */
  lang: LanguageWithAuto;

  profiles: WpProfile[];

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

  /**
   * Remember last selected post categories.
   */
  rememberLastSelectedCategories: boolean;

  /**
   * If WordPress edit confirm modal will be shown when published successfully.
   */
  showWordPressEditConfirm: boolean;

  mathJaxOutputType: MathJaxOutputType;

  commentConvertMode: CommentConvertMode;

  enableHtml: boolean;

  /**
   * Whether media links should be replaced after uploading to WordPress.
   */
  replaceMediaLinks: boolean;
}

export const DEFAULT_SETTINGS: WordpressPluginSettings = {
  lang: 'auto',
  profiles: [],
  showRibbonIcon: false,
  defaultPostStatus: PostStatus.Draft,
  defaultCommentStatus: CommentStatus.Open,
  rememberLastSelectedCategories: true,
  showWordPressEditConfirm: false,
  mathJaxOutputType: MathJaxOutputType.SVG,
  commentConvertMode: CommentConvertMode.Ignore,
  enableHtml: false,
  replaceMediaLinks: true,
}

export async function upgradeSettings(
  existingSettings: SafeAny,
  to: SettingsVersion
): Promise<{ needUpgrade: boolean, settings: WordpressPluginSettings }> {
  console.log(existingSettings, to);
  if (isUndefined(existingSettings.version)) {
    // V1
    if (to === SettingsVersion.V2) {
      const newSettings: WordpressPluginSettings = Object.assign({}, DEFAULT_SETTINGS, {
        version: SettingsVersion.V2,
        lang: existingSettings.lang,
        showRibbonIcon: existingSettings.showRibbonIcon,
        defaultPostStatus: existingSettings.defaultPostStatus,
        defaultCommentStatus: existingSettings.defaultCommentStatus,
        defaultPostType: 'post',
        rememberLastSelectedCategories: existingSettings.rememberLastSelectedCategories,
        showWordPressEditConfirm: existingSettings.showWordPressEditConfirm,
        mathJaxOutputType: existingSettings.mathJaxOutputType,
        commentConvertMode: existingSettings.commentConvertMode,
      });
      if (existingSettings.endpoint) {
        const endpoint = existingSettings.endpoint;
        const apiType = existingSettings.apiType;
        const xmlRpcPath = existingSettings.xmlRpcPath;
        const username = existingSettings.username;
        const password = existingSettings.password;
        const lastSelectedCategories = existingSettings.lastSelectedCategories;
        const crypto = new PassCrypto();
        const encryptedPassword = await crypto.encrypt(password);
        const profile = {
          name: WP_DEFAULT_PROFILE_NAME,
          apiType: apiType,
          endpoint: endpoint,
          xmlRpcPath: xmlRpcPath,
          saveUsername: !isNil(username),
          savePassword: !isNil(password),
          isDefault: true,
          lastSelectedCategories: lastSelectedCategories,
          username: username,
          encryptedPassword: encryptedPassword
        };
        newSettings.profiles = [
          profile
        ];
      } else {
        newSettings.profiles = [];
      }
      return {
        needUpgrade: true,
        settings: newSettings
      };
    }
  }
  return {
    needUpgrade: false,
    settings: existingSettings
  };
}
