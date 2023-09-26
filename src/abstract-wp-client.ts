import { arrayBufferToBase64, Modal, Notice, TFile } from 'obsidian';
import WordpressPlugin from './main';
import { openLoginModal } from './wp-login-modal';
import {
  WordPressAuthParams,
  WordPressClient,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressPostParams,
  WordPressPublishParams
} from './wp-client';
import { openPublishModal } from './wp-publish-modal';
import { Term } from './wp-api';
import { ERROR_NOTICE_TIMEOUT, WP_DEFAULT_PROFILE_NAME } from './consts';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { doClientPublish, isPromiseFulfilledResult, openWithBrowser, SafeAny } from './utils';
import { openPostPublishedModal } from './post-published-modal';
import { WpProfile } from './wp-profile';
import { AppState } from './app-state';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import { isNil } from 'lodash-es';
import fileTypeChecker from 'file-type-checker';
import { Media } from './types';


const matterOptions = {
  engines: {
    yaml: {
      parse: (input: string) => yaml.load(input) as object,
      stringify: (data: object) => {
        return yaml.dump(data, {
          styles: { '!!null': 'empty' }
        });
      }
    }
  }
};

export abstract class AbstractWordPressClient implements WordPressClient {

  /**
   * Client name.
   */
  name = 'AbstractWordPressClient';

  protected constructor(
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

  abstract uploadMedia(media: Media, certificate: WordPressAuthParams): Promise<WordPressClientResult>;

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

      const { activeEditor } = this.plugin.app.workspace;
      if (activeEditor && activeEditor.file) {
        (async () => {
          let username = null;
          let password = null;
          let loginModal;
          if (this.openLoginModal()) {
            if (this.profile.username && this.profile.password) {
              // saved username and password found
              username = this.profile.username;
              password = this.profile.password;
            } else {
              const loginModalReturns = await openLoginModal(this.plugin, this.profile);
              username = loginModalReturns.username;
              password = loginModalReturns.password;
              loginModal = loginModalReturns.loginModal;
            }
          }
          // start publishing...
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const noteTitle = activeEditor.file!.basename;
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const rawContent = await this.plugin.app.vault.read(activeEditor.file!);
          const { content, data: matterData } = matter(rawContent, matterOptions);

          if (!isNil(matterData.profileName)
            && matterData.profileName.length > 0
            && matterData.profileName !== this.profile.name
          ) {
            const confirm = await openConfirmModal({
              message: this.plugin.i18n.t('error_profileNotMatch'),
              cancelText: this.plugin.i18n.t('profileNotMatch_useOld', {
                profileName: matterData.profileName
              }),
              confirmText: this.plugin.i18n.t('profileNotMatch_useNew', {
                profileName: this.profile.name
              })
            }, this.plugin);
            if (confirm.code === ConfirmCode.Cancel) {
              doClientPublish(this.plugin, matterData.profileName);
              return Promise.resolve();
            } else {
              delete matterData.postId;
              matterData.categories = this.profile.lastSelectedCategories ?? [ 1 ];
            }
          }
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
              const selectedCategories = matterData.categories as number[]
                ?? this.profile.lastSelectedCategories
                ?? [ 1 ];
              const { postParams, publishModal } = await openPublishModal(
                this.plugin, categories, selectedCategories
              );
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
          } else {
            const invalidUsernameOrPassword = this.plugin.i18n.t('error_invalidUser');
            new Notice(invalidUsernameOrPassword, ERROR_NOTICE_TIMEOUT);
          }
        })();
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

      const activeFile = this.plugin.app.workspace.getActiveFile()
      if (activeFile === null) {
        new Notice(this.plugin.i18n.t('error_noActiveFile'), ERROR_NOTICE_TIMEOUT);
      }
      const images = getImages(postParams.content);
      for (const img of images) {
        const splitFile = img.src.split('.');
        const ext = splitFile.pop();
        const fileName = splitFile.join('.');
        // @ts-expect-error
        let filePath = (await this.plugin.app.vault.getAvailablePathForAttachments(
          fileName,
          ext,
          activeFile
        )) as string;
        const pathRegex = /(.*) \d+\.(.*)/;
        filePath = filePath.replace(pathRegex, '$1.$2');
        const imgFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
        if (imgFile instanceof TFile) {
          const content = await this.plugin.app.vault.readBinary(imgFile);
          const fileType = fileTypeChecker.detectFile(content);
          const result = await this.uploadMedia({
            mimeType: fileType?.mimeType ?? 'application/octet-stream',
            fileName: imgFile.name,
            content: content
          }, {
            username,
            password
          });
          console.log(result);
          throw new Error('yyy');
        }
      }
      console.log(AppState.getInstance().markdownParser.render(postParams.content));
      throw new Error('xxx');
      const result = await this.publish(
        postParams.title ?? 'A post from Obsidian!',
        AppState.getInstance().markdownParser.render(postParams.content) ?? '',
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
          matterData.profileName = this.profile.name;
          matterData.postId = postId;
          matterData.categories = postParams.categories;
          const modified = matter.stringify(postParams.content, matterData, matterOptions);
          this.updateFrontMatter(modified);

          if (this.plugin.settings.rememberLastSelectedCategories) {
            this.profile.lastSelectedCategories = (result.data as SafeAny).categories;
            await this.plugin.saveSettings();
          }

          if (this.plugin.settings.showWordPressEditConfirm) {
            openPostPublishedModal(this.plugin)
              .then(() => {
                openWithBrowser(`${this.profile.endpoint}/wp-admin/post.php`, {
                  action: 'edit',
                  post: postId
                });
              });
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
    postParams.profileName = matterData.profileName ?? WP_DEFAULT_PROFILE_NAME;
    if (matterData.categories) {
      postParams.categories = matterData.categories as number[] ?? this.profile.lastSelectedCategories;
    }
    if (matterData.tags) {
      postParams.tags = matterData.tags as string[];
    }
    return postParams;
  }

  private updateFrontMatter(value: string): void {
    const { activeEditor } = this.plugin.app.workspace;
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

interface Image {
  src: string;
  width?: string;
  height?: string;
}

function getImages(content: string): Image[] {
  const paths: Image[] = [];

  // for ![Alt Text](image-url)
  let regex = /!\[.*?(?:\|(\d+)(?:x(\d+))?)?]\((.*?)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[3],
      width: match[1],
      height: match[2]
    });
  }

  // for ![[image-name]]
  regex = /!\[\[(.*?)(?:\|(\d+)(?:x(\d+))?)?]]/g;
  while ((match = regex.exec(content)) !== null) {
    paths.push({
      src: match[1],
      width: match[2],
      height: match[3]
    });
  }

  return paths;
}
