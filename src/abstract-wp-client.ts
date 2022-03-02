import { App, MarkdownView, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { WpLoginModal } from './wp-login-modal';
import { WordPressClient, WordPressClientResult, WordPressClientReturnCode } from './wp-client';

export abstract class AbstractWordPressClient implements WordPressClient {

  protected constructor(
    protected readonly app: App,
    protected readonly plugin: WordpressPlugin
  ) { }

  abstract publish(
    title: string,
    content: string,
    wp: {
      userName: string,
      password: string
    }
  ): Promise<WordPressClientResult>;

  newPost(): Promise<WordPressClientResult> {
    return new Promise((resolve, reject) => {
      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if ( activeView ) {
        new WpLoginModal(
          this.app,
          this.plugin,
          (userName, password, modal) => {
            this.app.vault.read(activeView.file)
              .then(content => {
                const title = activeView.file.basename;
                return this.publish(title, content, {
                  userName,
                  password
                });
              })
              .then(result => {
                if (result.code === WordPressClientReturnCode.Error) {
                  const data = result.data as any; // eslint-disable-line
                  new Notice(`Post published failed!\n${data.code}: ${data.message}`);
                } else {
                  new Notice('Post published successfully!');
                  modal.close();
                }
                return result;
              })
              .catch(error => {
                console.log('Reading file content for \'newPost\' failed: ', error);
                new Notice(error.toString());
              });
          }
        ).open();
      } else {
        const error = 'There is no editor found. Nothing will be published.';
        console.warn(error);
        reject(new Error(error));
      }
    });
  }
}
