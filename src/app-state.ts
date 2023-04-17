import { Events } from 'obsidian';
import MarkdownIt from 'markdown-it';


export class AppState {
  private static instance: AppState;

  markdownParser = new MarkdownIt();

  events = new Events();

  /**
   * Code verifier between classes.
   */
  codeVerifier: string | undefined;

  private constructor() {
  }

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState();
    }
    return AppState.instance;
  }

}
