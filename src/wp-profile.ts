import { ApiType } from './settings';
import { WordPressOAuth2Token } from './oauth2-client';

export interface WpProfile {

  /**
   * Profile name.
   */
  name: string;

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

  /**
   * OAuth2 token for wordpress.com
   */
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
   * Is default profile.
   */
  isDefault: boolean;

  /**
   * Last selected post categories.
   */
  lastSelectedCategories: number[];
}

// export function isValidProfile(profile: WpProfile): boolean {
//   if (!isValidUrl(profile.url)) {
//     return false;
//   } else if (profile.rememberUsername && !profile.username) {
//     return false;
//   } else if (profile.rememberPassword && !profile.password) {
//     return false;
//   } else {
//     return true;
//   }
// }
