import { Events } from 'obsidian';

export class AppState {
  private static instance: AppState;

  events = new Events();

  /**
   * Code verifier between classes.
   */
  codeVerifier: string | undefined;

  private constructor() { }

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

}
