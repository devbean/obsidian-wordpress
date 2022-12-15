import { App, MarkdownView, Modal, Notice } from 'obsidian';
import WordpressPlugin from './main';
import { WpLoginModal } from './wp-login-modal';
import {
  WordPressAuthParams,
  WordPressClient,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressPostParams,
  WordPressPublishParams
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
    wp: WordPressAuthParams
  ): Promise<WordPressClientResult>;

  abstract getCategories(
    wp: {
      username: string,
      password: string
    }
  ): Promise<Term[]>;

  abstract checkUser(
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult>;

  newPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult> {
    return new Promise((resolve, reject) => {
      if (!this.plugin.settings.endpoint || this.plugin.settings.endpoint.length === 0) {
        new Notice(this.plugin.i18n.t('error_noEndpoint'), 0);
        reject(new Error('No endpoint set.'));
      }
      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if ( activeView ) {
        new WpLoginModal(
          this.app,
          this.plugin,
          async (username, password, loginModal) => {
            const checkUserResult = await this.checkUser({ username, password });
            if (checkUserResult.code === WordPressClientReturnCode.OK) {
              const content = await this.app.vault.read(activeView.file);
              const title = activeView.file.basename;
              if (defaultPostParams) {
                await this.doPublish({
                  title,
                  content,
                  username,
                  password,
                  postParams: defaultPostParams
                }, loginModal);
              } else {
                const categories = await this.getCategories({
                  username,
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
                      username,
                      password,
                      postParams
                    }, loginModal, publishModal);
                  }
                ).open();
              }
            } else {
              const invalidUsernameOrPassword = this.plugin.i18n.t('error_invalidUser');
              new Notice(invalidUsernameOrPassword, 0);
              reject(new Error(invalidUsernameOrPassword));
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
    wpParams: WordPressPublishParams,
    loginModal: Modal,
    publishModal?: Modal
  ): Promise<WordPressClientResult> {
    const { title, content, username, password, postParams } = wpParams;
    try {
      const result = await this.publish(
        title ?? 'A post from Obsidian!',
        marked.parse(content) ?? '',
        postParams,
        {
          username,
          password
        });
      console.log('newPost', result);
      if (result.code === WordPressClientReturnCode.Error) {
        const data = result.data as any; // eslint-disable-line
        new Notice(this.plugin.i18n.t('error_publishFailed', {
          code: data.code,
          message: data.message
        }), 0);
      } else {
        new Notice(this.plugin.i18n.t('message_publishSuccessfully'));
        if (publishModal) {
          publishModal.close();
        }
        loginModal.close();
      }
      return result;
    } catch (error) {
      console.log('Reading file content for \'newPost\' failed: ', error);
      new Notice(error.toString(), 0);
    }
    return Promise.reject('You should not be here!');
  }
}
