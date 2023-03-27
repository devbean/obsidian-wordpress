import { WpProfile } from './wp-profile';
import { WordPressOAuth2Token } from './oauth2-client';
import { createSignal } from 'solid-js';

export class AppData {
  private static instance: AppData;


  /**
   * Code verifier between classes.
   */
  codeVerifier: string | undefined;
  oauth2Token = createSignal<WordPressOAuth2Token | undefined>(undefined);

  private constructor() { }

  static getInstance(): AppData {
    if (!AppData.instance) {
      AppData.instance = new AppData();
    }
    return AppData.instance;
  }

}
