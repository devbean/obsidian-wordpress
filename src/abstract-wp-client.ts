import { App, MarkdownView, Modal, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { WpLoginModal } from './wp-login-modal';
import {
  WordPressClient,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressPostParams
} from './wp-client';
import { marked } from 'marked';
import { WpPublishModal } from './wp-publish-modal';
import { Term } from './wp-api';


export abstract class AbstractWordPressClient implements WordPressClient {

  protected constructor(
    protected readonly app: App,
    protected readonly plugin: WordpressPlugin
  ) { }

  abstract publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    wp: {
      userName: string,
      password: string
    }
  ): Promise<WordPressClientResult>;

  abstract getCategories(
    wp: {
      userName: string,
      password: string
    }
  ): Promise<Term[]>;

  newPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult> {
    return new Promise((resolve, reject) => {
      if (!this.plugin.settings.endpoint || this.plugin.settings.endpoint.length === 0) {
        new Notice(this.plugin.i18n.t('error_noEndpoint'));
        reject(new Error('No endpoint set.'));
      }
      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if ( activeView ) {
        new WpLoginModal(
          this.app,
          this.plugin,
          async (userName, password, loginModal) => {
            const content = await this.app.vault.read(activeView.file);
            const title = activeView.file.basename;
            if (defaultPostParams) {
              await this.doPublish({
                title,
                content,
                userName,
                password,
                postParams: defaultPostParams
              }, loginModal);
            } else {
              const categories = await this.getCategories({
                userName,
                password
              });
              new WpPublishModal(
                this.app,
                this.plugin,
                categories,
                async (postParams, publishModal) => {
                  await this.doPublish({
                    title,
                    content,
                    userName,
                    password,
                    postParams
                  }, loginModal, publishModal);
                }
              ).open();
            }
          }
        ).open();
      } else {
        const error = 'There is no editor found. Nothing will be published.';
        console.warn(error);
        reject(new Error(error));
      }
    });
  }

  private async doPublish(
    wpParams: {
      title: string,
      content: string,
      userName: string,
      password: string,
      postParams: WordPressPostParams
    },
    loginModal: Modal,
    publishModal?: Modal
  ): Promise<WordPressClientResult> {
    const { title, content, userName, password, postParams } = wpParams;
    try {
      const result = await this.publish(
        title ?? 'A post from Obsidian!',
        marked.parse(content) ?? '',
        postParams,
        {
          userName,
          password
        });
      console.log('newPost', result);
      if (result.code === WordPressClientReturnCode.Error) {
        const data = result.data as any; // eslint-disable-line
        new Notice(`Post published failed!\n${data.code}: ${data.message}`);
      } else {
        new Notice('Post published successfully!');
        if (publishModal) {
          publishModal.close();
        }
        loginModal.close();
      }
      return result;
    } catch (error) {
      console.log('Reading file content for \'newPost\' failed: ', error);
      new Notice(error.toString());
    }
    return Promise.reject('You should not be here!');
  }
}
