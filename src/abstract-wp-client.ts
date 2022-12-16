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
import { ERROR_NOTICE_TIMEOUT } from './consts';


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
      username: string | null,
      password: string | null
    }
  ): Promise<Term[]>;

  abstract validateUser(
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult>;

  protected openLoginModal(): boolean {
    return true;
  }

  newPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult> {
    return new Promise<WordPressClientResult>((resolve, reject) => {
      if (!this.plugin.settings.endpoint || this.plugin.settings.endpoint.length === 0) {
        new Notice(this.plugin.i18n.t('error_noEndpoint'), ERROR_NOTICE_TIMEOUT);
        reject({
          code: WordPressClientReturnCode.Error,
          data: new Error('No endpoint set.')
        });
      }

      const { workspace } = this.app;
      const activeView = workspace.getActiveViewOfType(MarkdownView);
      if (activeView) {
        const title = activeView.file.basename;
        let content = '';
        (async () => {
          content = await this.app.vault.read(activeView.file);
        })();

        const publishPost = async (
          username: string | null,
          password: string | null,
          loginModal?: Modal
        ) => {
          const validateUserResult = await this.validateUser({ username, password });
          if (validateUserResult.code === WordPressClientReturnCode.OK) {
            if (defaultPostParams) {
              const result = await this.doPublish({
                title,
                content,
                username,
                password,
                postParams: defaultPostParams
              }, loginModal);
              resolve(result);
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
                  const result = await this.doPublish({
                    title,
                    content,
                    username,
                    password,
                    postParams
                  }, loginModal, publishModal);
                  resolve(result);
                }
              ).open();
            }
          } else {
            const invalidUsernameOrPassword = this.plugin.i18n.t('error_invalidUser');
            new Notice(invalidUsernameOrPassword, ERROR_NOTICE_TIMEOUT);
          }
        };

        if (this.openLoginModal()) {
          new WpLoginModal(
            this.app,
            this.plugin,
            (username, password, loginModal) => {
              publishPost(username, password, loginModal).then(r => {
                // make compiler happy
              });
            }
          ).open();
        } else {
          publishPost(null, null).then(r => {
            // make compiler happy
          });
        }
      } else {
        const error = 'There is no editor found. Nothing will be published.';
        console.warn(error);
        reject({
          code: WordPressClientReturnCode.Error,
          data: new Error(error)
        });
      }
    })
      .catch(error => {
        console.log(error);
        return error;
      });
  }

  private async doPublish(
    wpParams: WordPressPublishParams,
    loginModal?: Modal,
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
        publishModal?.close();
        loginModal?.close();
      }
      return result;
    } catch (error) {
      console.log('Reading file content for \'newPost\' failed: ', error);
      new Notice(error.toString(), ERROR_NOTICE_TIMEOUT);
    }
    return Promise.reject('You should not be here!');
  }

}
