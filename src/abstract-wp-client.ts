import { App, Modal, Notice } from 'obsidian';
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
import matter from 'gray-matter';
import { isPromiseFulfilledResult, openWithBrowser, SafeAny } from './utils';
import { PostPublishedModal } from './post-published-modal';
import { WpProfile } from './wp-profile';


export abstract class AbstractWordPressClient implements WordPressClient {

  protected constructor(
    protected readonly app: App,
    protected readonly plugin: WordpressPlugin,
    protected readonly profile: WpProfile
  ) { }

  abstract publish(
    title: string,
    content: string,
    postParams: WordPressPostParams,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult>;

  abstract getCategories(
    certificate: WordPressAuthParams
  ): Promise<Term[]>;

  abstract validateUser(
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult>;

  abstract getTag(
    name: string,
    certificate: WordPressAuthParams
  ): Promise<Term>;

  protected openLoginModal(): boolean {
    return true;
  }

  publishPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult> {
    return new Promise<WordPressClientResult>((resolve, reject) => {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        new Notice(this.plugin.i18n.t('error_noEndpoint'), ERROR_NOTICE_TIMEOUT);
        reject({
          code: WordPressClientReturnCode.Error,
          data: new Error('No endpoint set.')
        });
      }

      const { activeEditor } = this.app.workspace;
      if (activeEditor && activeEditor.file) {
        const publishToWordPress = async (
          username: string | null,
          password: string | null,
          loginModal?: Modal
        ) => {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const noteTitle = activeEditor.file!.basename;
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const rawContent = await this.app.vault.read(activeEditor.file!);
          const { content, data: matterData } = matter(rawContent);

          const validateUserResult = await this.validateUser({ username, password });
          if (validateUserResult.code === WordPressClientReturnCode.OK) {
            if (defaultPostParams) {
              const params = this.readFromFrontMatter(noteTitle, matterData, defaultPostParams);
              params.content = content;
              const result = await this.doPublish({
                username,
                password,
                postParams: params,
                matterData
              }, loginModal);
              resolve(result);
            } else {
              const categories = await this.getCategories({
                username,
                password
              });
              const selectedCategories = matterData.categories as number[] ?? this.profile.lastSelectedCategories;
              new WpPublishModal(
                this.app,
                this.plugin,
                categories,
                selectedCategories,
                async (postParams, publishModal) => {
                  const params = this.readFromFrontMatter(noteTitle, matterData, postParams);
                  params.content = content;
                  const result = await this.doPublish({
                    username,
                    password,
                    postParams: params,
                    matterData
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
          if (this.profile.username && this.profile.password) {
            // saved username and password found
            publishToWordPress(this.profile.username, this.profile.password).then(() => {
              // make compiler happy
            });
          } else {
            new WpLoginModal(
              this.app,
              this.plugin,
              this.profile,
              (username, password, loginModal) => {
                publishToWordPress(username, password, loginModal).then(() => {
                  // make compiler happy
                });
              }
            ).open();
          }
        } else {
          publishToWordPress(null, null).then(() => {
            // make compiler happy
          });
        }
      } else {
        const error = 'There is no editor or file found. Nothing will be published.';
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
    publishParams: WordPressPublishParams,
    loginModal?: Modal,
    publishModal?: Modal
  ): Promise<WordPressClientResult> {
    const { username, password, postParams, matterData } = publishParams;
    try {
      const tagTerms = await this.getTags(postParams.tags, {
        username,
        password
      });
      postParams.tags = tagTerms.map(term => term.id);
      const result = await this.publish(
        postParams.title ?? 'A post from Obsidian!',
        marked.parse(postParams.content) ?? '',
        postParams,
        {
          username,
          password
        });
      console.log('doPublish', result);
      if (result.code === WordPressClientReturnCode.Error) {
        const data = result.data as SafeAny;
        new Notice(this.plugin.i18n.t('error_publishFailed', {
          code: data.code,
          message: data.message
        }), ERROR_NOTICE_TIMEOUT);
      } else {
        new Notice(this.plugin.i18n.t('message_publishSuccessfully'));
        publishModal?.close();
        loginModal?.close();

        // post id will be returned if creating, true if editing
        const postId = (result.data as SafeAny).postId;
        if (postId) {
          // save post id to front-matter
          matterData.postId = postId;
          matterData.categories = postParams.categories;
          const modified = matter.stringify(postParams.content, matterData);
          this.updateFrontMatter(modified);

          if (this.plugin.settings.rememberLastSelectedCategories) {
            this.profile.lastSelectedCategories = (result.data as SafeAny).categories;
            await this.plugin.saveSettings();
          }

          if (this.plugin.settings.showWordPressEditConfirm) {
            new PostPublishedModal(this.app, this.plugin, (modal: Modal) => {
              openWithBrowser(`${this.profile.endpoint}/wp-admin/post.php`, {
                action: 'edit',
                post: postId
              });
              modal.close();
            }).open();
          }
        }
      }
      return result;
    } catch (error) {
      console.log('Reading file content for \'doPublish\' failed: ', error);
      new Notice((error as SafeAny).toString(), ERROR_NOTICE_TIMEOUT);
    }
    return Promise.reject('You should not be here!');
  }

  private getTags(tags: string[], certificate: WordPressAuthParams): Promise<Term[]> {
    return Promise.allSettled(tags.map(name => this.getTag(name, certificate)))
      .then(results => {
        const terms: Term[] = [];
        results
          .forEach(result => {
            if (isPromiseFulfilledResult<Term>(result)) {
              terms.push(result.value);
            }
          });
        return terms;
      });
  }

  private readFromFrontMatter(
    noteTitle: string,
    matterData: { [p: string]: SafeAny },
    params: WordPressPostParams
  ): WordPressPostParams {
    const postParams = { ...params };
    postParams.title = noteTitle;
    if (matterData.title) {
      postParams.title = matterData.title;
    }
    if (matterData.postId) {
      postParams.postId = matterData.postId;
    }
    if (matterData.categories) {
      postParams.categories = matterData.categories as number[] ?? this.profile.lastSelectedCategories;
    }
    if (matterData.tags) {
      postParams.tags = matterData.tags as string[];
    }
    return postParams;
  }

  private updateFrontMatter(value: string): void {
    const { activeEditor } = this.app.workspace;
    if (activeEditor) {
      const editor = activeEditor.editor;
      if (editor) {
        const { left, top } = editor.getScrollInfo();
        const position = editor.getCursor();

        editor.setValue(value);
        editor.scrollTo(left, top);
        editor.setCursor(position);
      }
    }
  }

}
