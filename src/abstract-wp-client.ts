import { Notice, TFile } from 'obsidian';
import WordpressPlugin from './main';
import {
  WordPressAuthParams,
  WordPressClient,
  WordPressClientResult,
  WordPressClientReturnCode,
  WordPressMediaUploadResult,
  WordPressPostParams,
  WordPressPublishResult
} from './wp-client';
import { WpPublishModal } from './wp-publish-modal';
import { PostStatus, PostType, PostTypeConst, Term } from './wp-api';
import { ERROR_NOTICE_TIMEOUT, WP_DEFAULT_PROFILE_NAME } from './consts';
import { isPromiseFulfilledResult, openWithBrowser, processFile, SafeAny, showError, } from './utils';
import { WpProfile } from './wp-profile';
import { AppState } from './app-state';
import { ConfirmCode, openConfirmModal } from './confirm-modal';
import { MatterData, Media } from './types';
import { openPostPublishedModal } from './post-published-modal';
import { openLoginModal } from './wp-login-modal';
import { isFunction, isArray, isString } from 'lodash-es';
import { MarkdownItWikiLinkPluginInstance } from './markdown-it-wikilink-plugin';
import { renderMermaidDiagrams } from './mermaid-renderer';
import { ensureEmbeddedStyles } from './embedded-styles';
import {
  collectWikiLinkTargets,
  createWikiLinkResolver,
  decodeMediaSrc,
  expandNoteEmbeds,
  getMediaRefs,
  getFileReferences,
  getMarkdownLinkRefs,
  isLocalFileReference,
  markdownLinkReplacement,
  isImageFile,
  MediaRef,
  mimeTypeFor,
  replaceContentRanges
} from './publish-converters';
import { BatchPublishOptions, BatchPublishPlan, BatchPublishResult, runBatchPublish } from './batch-publish';
import { subpathAnchor } from './markdown-it-anchor-plugin';

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
  ): Promise<WordPressClientResult<WordPressPublishResult>>;

  abstract getCategories(
    certificate: WordPressAuthParams
  ): Promise<Term[]>;

  abstract getPostTypes(
    certificate: WordPressAuthParams
  ): Promise<PostType[]>;

  abstract validateUser(
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<boolean>>;

  abstract getTag(
    name: string,
    certificate: WordPressAuthParams
  ): Promise<Term>;

  abstract uploadMedia(
    media: Media,
    certificate: WordPressAuthParams
  ): Promise<WordPressClientResult<WordPressMediaUploadResult>>;

  protected needLogin(): boolean {
    return true;
  }

  private async getAuth(): Promise<WordPressAuthParams> {
    let auth: WordPressAuthParams = {
      username: null,
      password: null
    };
    try {
      if (this.needLogin()) {
        // Check if there's saved username and password
        if (this.profile.username && this.profile.password) {
          auth = {
            username: this.profile.username,
            password: this.profile.password
          };
          const authResult = await this.validateUser(auth);
          if (authResult.code !== WordPressClientReturnCode.OK) {
            throw new Error(this.plugin.i18n.t('error_invalidUser'));
          }
        } else { throw new Error(this.plugin.i18n.t('error_invalidUser')); }
      }
    } catch (error) {
      showError(error);
      const result = await openLoginModal(this.plugin, this.profile, async (auth) => {
        const authResult = await this.validateUser(auth);
        return authResult.code === WordPressClientReturnCode.OK;
      });
      auth = result.auth;
    }
    return auth;
  }

  /**
   * Checks if the profile in the note frontmatter matches the current
   * one. Asks the user what to do if not.
   *
   * Returns `true` if the user chose to publish with the profile
   * stored in the frontmatter. The caller should then republish
   * using that profile instead.
   */
  private async checkExistingProfile(matterData: MatterData): Promise<boolean> {
    const { profileName } = matterData;
    const isProfileNameMismatch = profileName && profileName !== this.profile.name;
    if (isProfileNameMismatch) {
      const confirm = await openConfirmModal({
        message: this.plugin.i18n.t('error_profileNotMatch'),
        cancelText: this.plugin.i18n.t('profileNotMatch_useOld', {
          profileName: matterData.profileName
        }),
        confirmText: this.plugin.i18n.t('profileNotMatch_useNew', {
          profileName: this.profile.name
        })
      }, this.plugin);
      if (confirm.code !== ConfirmCode.Cancel) {
        delete matterData.postId;
        matterData.categories = this.profile.lastSelectedCategories ?? [ 1 ];
        return false;
      }
      return true;
    }
    return false;
  }

  private async tryToPublish(params: {
    postParams: WordPressPostParams,
    auth: WordPressAuthParams,
    sourceFile: TFile,
    publishedLinks?: Map<string, string>,
    updateMatterData?: (matter: MatterData) => void,
    batchAttachments?: Set<string>,
  }): Promise<WordPressClientResult<WordPressPublishResult>> {
    const { postParams, auth, sourceFile, publishedLinks, updateMatterData } = params;
    const tagTerms = await this.getTags(postParams.tags, auth);
    postParams.tags = tagTerms.map(term => term.id);
    await this.updatePostImages({
      auth,
      postParams,
      sourceFile,
      batchAttachments: params.batchAttachments
    });
    // mermaid diagrams are rendered to inline SVG before the synchronous
    // markdown pass, so the post is self-contained
    const mermaidResult = await renderMermaidDiagrams(postParams.content);
    postParams.content = mermaidResult.content;
    if (mermaidResult.failed.length > 0) {
      new Notice(this.plugin.i18n.t('warning_mermaidRenderFailed', {
        count: String(mermaidResult.failed.length)
      }), ERROR_NOTICE_TIMEOUT);
    }
    // Set synchronous parser state only after asynchronous rendering finishes.
    MarkdownItWikiLinkPluginInstance.resetUnresolved();
    MarkdownItWikiLinkPluginInstance.setResolver(
      createWikiLinkResolver(this.plugin.app, this.profile, sourceFile, publishedLinks)
    );
    const html = ensureEmbeddedStyles(AppState.markdownParser.render(postParams.content, { mermaidSvgs: mermaidResult.svgs }));
    const highlighted = (html.match(/class="language-/g) ?? []).length;
    if (!params.batchAttachments && (mermaidResult.rendered > 0 || highlighted > 0)) {
      // lets the user confirm the new publish pipeline actually ran
      new Notice(this.plugin.i18n.t('message_publishPipelineStats', {
        mermaid: String(mermaidResult.rendered),
        code: String(highlighted)
      }), ERROR_NOTICE_TIMEOUT);
    }
    this.showUnresolvedLinks();
    const result = await this.publish(
      postParams.title ?? 'A post from Obsidian!',
      html,
      postParams,
      auth);
    if (result.code === WordPressClientReturnCode.Error) {
      throw new Error(this.plugin.i18n.t('error_publishFailed', {
        code: result.error.code as string,
        message: result.error.message
      }));
    } else {
      if (!params.batchAttachments) new Notice(this.plugin.i18n.t('message_publishSuccessfully'));
      // post id will be returned if creating, true if editing
      const postId = result.data.postId;
      if (postId) {
        const postLink = result.data.link;
        await this.plugin.app.fileManager.processFrontMatter(sourceFile, fm => {
          fm.profileName = this.profile.name;
          fm.postId = postId;
          fm.postType = postParams.postType;
          if (postParams.postType === PostTypeConst.Post) {
            fm.categories = postParams.categories;
          }
          // remember the permalink of the published post, so that
          // wikilinks from other notes could link to this post
          if (postLink) {
            fm.postLink = postLink;
          }
          if (isFunction(updateMatterData)) {
            updateMatterData(fm);
          }
        });

        if (this.plugin.settings.rememberLastSelectedCategories) {
          this.profile.lastSelectedCategories = (result.data as SafeAny).categories;
          await this.plugin.saveSettings();
        }

        if (!params.batchAttachments && this.plugin.settings.showWordPressEditConfirm) {
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
  }

  private showUnresolvedLinks(): void {
    const unresolved = MarkdownItWikiLinkPluginInstance.takeUnresolved();
    if (unresolved.length > 0) {
      const links = [ ...new Set(unresolved) ].slice(0, 5).join(', ');
      const suffix = unresolved.length > 5 ? '…' : '';
      new Notice(this.plugin.i18n.t('warning_unresolvedLinks', {
        links: `${links}${suffix}`
      }), ERROR_NOTICE_TIMEOUT);
    }
  }

  private async updatePostImages(params: {
    postParams: WordPressPostParams,
    auth: WordPressAuthParams,
    sourceFile: TFile,
    batchAttachments?: Set<string>,
    embedsOnly?: boolean,
  }): Promise<void> {
    const { postParams, auth, sourceFile, batchAttachments, embedsOnly } = params;

    const mediaRefs = batchAttachments && !embedsOnly
      ? getFileReferences(postParams.content).filter(ref => ref.syntax.endsWith('-link'))
      : getMediaRefs(postParams.content);
    if (mediaRefs.length === 0) {
      if (batchAttachments && !embedsOnly) await this.updatePostImages({...params,embedsOnly:true});
      return;
    }

    const replacements: { start: number, end: number, replacement: string }[] = [];
    // cache of uploaded media during this publish, so that the same
    // media file is only uploaded once per publish
    const uploadedInThisPublish = new Map<string, string>();

    for (const ref of mediaRefs) {
      if (!isLocalFileReference(ref.src)) {
        // src is a url, skip uploading
        continue;
      }
      const linkpath = decodeMediaSrc(ref.src.split('#')[0].trim());
      if (linkpath.length === 0) {
        continue;
      }
      const mediaFile = this.plugin.app.metadataCache.getFirstLinkpathDest(linkpath, sourceFile.path);
      if (!(mediaFile instanceof TFile)) {
        new Notice(this.plugin.i18n.t('warning_mediaNotFound', {
          name: ref.src
        }), ERROR_NOTICE_TIMEOUT);
        continue;
      }
      // Failed/cyclic/deep note embeds must never become raw attachments.
      if (mediaFile.extension.toLowerCase() === 'md') continue;
      if (batchAttachments && !batchAttachments.has(mediaFile.path)) {
        throw new Error(this.plugin.i18n.t('batch_unapprovedAttachment', {path: mediaFile.path}));
      }

      let url = uploadedInThisPublish.get(mediaFile.path);
      if (!url) {
        url = await this.getCachedMediaUrl(mediaFile);
      }
      if (!url) {
        const content = await this.plugin.app.vault.readBinary(mediaFile);
        const result = await this.uploadMedia({
          mimeType: mimeTypeFor(mediaFile, content),
          fileName: mediaFile.name,
          content: content
        }, auth);
        if (result.code === WordPressClientReturnCode.OK) {
          url = result.data.url;
          uploadedInThisPublish.set(mediaFile.path, url);
          await this.setCachedMediaUrl(mediaFile, url);
        } else if (batchAttachments) {
          throw new Error(this.plugin.i18n.t('error_mediaUploadFailed', {name: mediaFile.name}) + ': ' + result.error.message);
        } else if (result.error.code === WordPressClientReturnCode.ServerInternalError) {
          new Notice(result.error.message, ERROR_NOTICE_TIMEOUT);
          continue;
        } else {
          new Notice(this.plugin.i18n.t('error_mediaUploadFailed', {
            name: mediaFile.name,
          }), ERROR_NOTICE_TIMEOUT);
          continue;
        }
      } else {
        uploadedInThisPublish.set(mediaFile.path, url);
      }

      replacements.push({
        start: ref.start,
        end: ref.end,
        replacement: buildMediaReplacement(ref, mediaFile, url),
      });
    }

    postParams.content = replaceContentRanges(postParams.content, replacements);

    if (this.plugin.settings.replaceMediaLinks && replacements.length > 0) {
      // replace the media links in the note itself. The expanded content
      // is never written back, only the media replacements are applied
      // to the original note content.
      await this.plugin.app.vault.process(sourceFile, noteContent => {
        const edits: typeof replacements = [];
        const refs = batchAttachments && !embedsOnly ? getFileReferences(noteContent).filter(ref => ref.syntax.endsWith('-link')) : getMediaRefs(noteContent);
        for (const ref of refs) {
          if (!isLocalFileReference(ref.src)) continue;
          const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(decodeMediaSrc(ref.src.split('#')[0]),sourceFile.path);
          if (!(dest instanceof TFile) || dest.extension.toLowerCase() === 'md') continue;
          const url = uploadedInThisPublish.get(dest.path);
          if (url) edits.push({start:ref.start,end:ref.end,replacement:buildMediaReplacement(ref,dest,url)});
        }
        return replaceContentRanges(noteContent,edits);
      });
    }
    if (batchAttachments && !embedsOnly) await this.updatePostImages({...params,embedsOnly:true});
  }

  /**
   * Returns the uploaded WordPress URL of the media file if it has been
   * uploaded before and has not been modified since then.
   */
  private async getCachedMediaUrl(file: TFile): Promise<string | undefined> {
    const key = await this.mediaCacheKey(file);
    const cache = this.plugin.settings.mediaUploadCache;
    const entry = cache?.[key];
    if (entry && entry.mtime === file.stat.mtime) {
      return entry.url;
    }
    return undefined;
  }

  private async setCachedMediaUrl(file: TFile, url: string): Promise<void> {
    const key = await this.mediaCacheKey(file);
    if (!this.plugin.settings.mediaUploadCache) {
      this.plugin.settings.mediaUploadCache = {};
    }
    // drop the whole cache when it grows too large
    if (Object.keys(this.plugin.settings.mediaUploadCache).length >= MEDIA_CACHE_MAX_ENTRIES) {
      this.plugin.settings.mediaUploadCache = {};
    }
    this.plugin.settings.mediaUploadCache[key] = { url, mtime: file.stat.mtime };
    await this.plugin.saveSettings();
  }

  private async mediaCacheKey(file: TFile): Promise<string> {
    // Account isolation must not persist an unremembered username in a key.
    const identity = JSON.stringify([this.profile.endpoint.replace(/\/+$/, ''), this.profile.username ?? '', this.profile.wpComOAuth2Token?.blogId ?? '']);
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity));
    const scope = Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    return JSON.stringify([scope,file.path]);
  }

  async publishPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult<WordPressPublishResult>> {
    const file = this.plugin.app.workspace.getActiveFile();
    if (file === null) {
      throw new Error(this.plugin.i18n.t('error_noActiveFile'));
    }
    return this.publishFile(file, { defaultPostParams });
  }

  /** Batch publishing never expands the approved set or opens per-note dialogs. */
  async publishBatch(plan: BatchPublishPlan, options: BatchPublishOptions & {status?: PostStatus} = {}): Promise<BatchPublishResult> {
    if (plan.profileName !== this.profile.name || plan.endpoint !== this.profile.endpoint) {
      throw new Error(this.plugin.i18n.t('batch_profileChanged'));
    }
    if (options.shouldCancel?.() || !plan.entries.length) {
      return {cancelled: true, items: plan.entries.map(entry => ({path:entry.file.path,status:'skipped'}))};
    }
    const auth = await this.getAuth();
    const attachments = new Set(plan.attachments.map(file => file.path));
    return runBatchPublish(plan, async (entry, links, receipt) => {
      const matter = {...entry.matter};
      if (matter.profileName && matter.profileName !== this.profile.name) {
        delete matter.postId;
        delete matter.postLink;
        delete matter.categories;
      }
      const params = this.readFromFrontMatter(entry.file.basename, matter, this.buildDefaultPostParams());
      if (receipt) params.postId = receipt.postId;
      if (options.status) params.status = options.status;
      params.content = entry.content;
      const edits: Array<{start:number,end:number,replacement:string}> = [];
      for (const ref of [...getMediaRefs(entry.content), ...getMarkdownLinkRefs(entry.content)]) {
        if (!ref.syntax.startsWith('markdown') || !isLocalFileReference(ref.src)) continue;
        const [path,...fragment] = ref.src.split('#');
        const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(decodeMediaSrc(path), entry.file.path);
        if (!(dest instanceof TFile) || dest.extension.toLowerCase() !== 'md') continue;
        const link = links.get(dest.path);
        if (link) {
          const anchor = fragment.length ? '#' + encodeURIComponent(subpathAnchor(decodeMediaSrc(fragment.join('#')))) : '';
          edits.push({start:ref.start,end:ref.end,replacement:markdownLinkReplacement(ref, link.split('#')[0] + anchor)});
        }
      }
      params.content = replaceContentRanges(params.content,edits);
      return this.tryToPublish({auth,postParams:params,sourceFile:entry.file,publishedLinks:links,batchAttachments:attachments});
    },options);
  }

  /**
   * Publishes a single note file. Notes referenced by wikilinks which
   * have not been published yet are published first (recursively,
   * cycle-safe) when the `autoPublishLinkedNotes` setting is on.
   */
  private async publishFile(
    file: TFile,
    options: {
      defaultPostParams?: WordPressPostParams,
      auto?: boolean,
      visited?: Set<string>,
      publishedLinks?: Map<string, string>,
    } = {}
  ): Promise<WordPressClientResult<WordPressPublishResult>> {
    const { defaultPostParams, auto = false, publishedLinks = options.publishedLinks ?? new Map<string, string>() } = options;
    const visited = options.visited ?? new Set<string>();
    visited.add(file.path);
    try {
      if (!this.profile.endpoint || this.profile.endpoint.length === 0) {
        throw new Error(this.plugin.i18n.t('error_noEndpoint'));
      }

      // get auth info
      const auth = await this.getAuth();

      // read note title, content and matter data
      const title = file.basename;
      const { content, matter: matterData } = await processFile(file, this.plugin.app);

      // expand note embeds `![[note]]` into note contents
      const expandResult = await expandNoteEmbeds(this.plugin.app, file, content);
      if (expandResult.failed.length > 0) {
        new Notice(this.plugin.i18n.t('warning_embedCycle', {
          names: [ ...new Set(expandResult.failed) ].slice(0, 3).join(', ')
        }), ERROR_NOTICE_TIMEOUT);
      }

      if (!auto) {
        // check if profile selected is matched to the one in note property,
        // if not, ask whether to update or not
        const useOldProfile = await this.checkExistingProfile(matterData);
        if (useOldProfile) {
          // the user wants to publish with the profile stored in the note,
          // republish with that profile instead of the current one, otherwise
          // the post id from another site would be used against this site
          const oldProfile = this.plugin.settings.profiles.find(p => p.name === matterData.profileName);
          if (oldProfile) {
            const { getWordPressClient } = await import('./wp-clients');
            const client = getWordPressClient(this.plugin, oldProfile);
            if (client) {
              if (client instanceof AbstractWordPressClient) {
                return client.publishFile(file, { defaultPostParams });
              }
            }
          }
          throw new Error(this.plugin.i18n.t('error_noSuchProfile', {
            profileName: String(matterData.profileName)
          }));
        }
      }

      // now we're preparing the publishing data
      let postParams: WordPressPostParams;
      let result: WordPressClientResult<WordPressPublishResult> | undefined;
      if (defaultPostParams || auto) {
        postParams = this.readFromFrontMatter(title, matterData, defaultPostParams ?? this.buildDefaultPostParams());
        postParams.content = expandResult.content;
        await this.autoPublishLinkedNotes(file, expandResult.content, visited, publishedLinks);
        result = await this.tryToPublish({
          auth,
          postParams,
          sourceFile: file,
          publishedLinks
        });
      } else {
        const categories = await this.getCategories(auth);
        const selectedCategories = matterData.categories as number[]
          ?? this.profile.lastSelectedCategories
          ?? [ 1 ];
        const postTypes = await this.getPostTypes(auth);
        if (postTypes.length === 0) {
          postTypes.push(PostTypeConst.Post);
        }
        const selectedPostType = matterData.postType ?? PostTypeConst.Post;
        result = await new Promise(resolve => {
          const publishModal = new WpPublishModal(
            this.plugin,
            { items: categories, selected: selectedCategories },
            { items: postTypes, selected: selectedPostType },
            async (postParams: WordPressPostParams, updateMatterData: (matter: MatterData) => void) => {
              postParams = this.readFromFrontMatter(title, matterData, postParams);
              postParams.content = expandResult.content;
              try {
                await this.autoPublishLinkedNotes(file, expandResult.content, visited, publishedLinks);
                const r = await this.tryToPublish({
                  auth,
                  postParams,
                  sourceFile: file,
                  publishedLinks,
                  updateMatterData
                });
                if (r.code === WordPressClientReturnCode.OK) {
                  publishModal.closeAfterPublish();
                  resolve(r);
                }
              } catch (error) {
                if (error instanceof Error) {
                  return showError(error);
                } else {
                  throw error;
                }
              }
            },
            matterData,
            () => resolve({code:WordPressClientReturnCode.Error,error:{code:WordPressClientReturnCode.Error,message:this.plugin.i18n.t('message_publishCancelled')}}));
          publishModal.open();
        });
      }
      if (result) {
        return result;
      } else {
        throw new Error(this.plugin.i18n.t("message_publishFailed"));
      }
    } catch (error) {
      if (error instanceof Error) {
        return showError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Publishes unpublished notes which are referenced by wikilinks in
   * the content before the current note, so that wikilinks resolve to
   * their permalinks. Already published notes (frontmatter `postId`)
   * are skipped, cycles are handled through the visited set.
   */
  private async autoPublishLinkedNotes(
    sourceFile: TFile,
    content: string,
    visited: Set<string>,
    publishedLinks: Map<string, string>
  ): Promise<void> {
    if (!this.plugin.settings.autoPublishLinkedNotes) {
      return;
    }
    const seen = new Set<string>();
    for (const target of collectWikiLinkTargets(content)) {
      if (seen.has(target)) {
        continue;
      }
      seen.add(target);
      const dest = this.plugin.app.metadataCache.getFirstLinkpathDest(target, sourceFile.path);
      if (!(dest instanceof TFile) || dest.extension !== 'md') {
        continue;
      }
      if (visited.has(dest.path)) {
        continue;
      }
      const frontmatter = this.plugin.app.metadataCache.getFileCache(dest)?.frontmatter;
      if (frontmatter?.postId) {
        // already published, the wikilink will resolve to its permalink
        continue;
      }
      visited.add(dest.path);
      new Notice(this.plugin.i18n.t('message_autoPublishingLinked', {
        name: dest.basename
      }), ERROR_NOTICE_TIMEOUT);
      try {
        const r = await this.publishFile(dest, { auto: true, visited, publishedLinks });
        if (r.code === WordPressClientReturnCode.OK && r.data.link) {
          // remember the permalink in memory: the metadata cache may not
          // have picked up the freshly written frontmatter yet
          publishedLinks.set(dest.path, r.data.link);
        }
      } catch (error) {
        // a failed linked note does not block publishing the current one
        showError(error);
      }
    }
  }

  private buildDefaultPostParams(): WordPressPostParams {
    return {
      status: this.plugin.settings.defaultPostStatus,
      commentStatus: this.plugin.settings.defaultCommentStatus,
      categories: this.profile.lastSelectedCategories ?? [ 1 ],
      postType: PostTypeConst.Post,
      tags: [],
      title: '',
      content: '',
    };
  }

  private async getTags(tags: string[], certificate: WordPressAuthParams): Promise<Term[]> {
    const results = await Promise.allSettled(tags.map(name => this.getTag(name, certificate)));
    const terms: Term[] = [];
    results
      .forEach(result => {
        if (isPromiseFulfilledResult<Term>(result)) {
          terms.push(result.value);
        }
      });
    return terms;
  }

  private readFromFrontMatter(
    noteTitle: string,
    matterData: MatterData,
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
    if (matterData.postType) {
      postParams.postType = matterData.postType;
    } else {
      // if there is no post type in matter-data, assign it as 'post'
      postParams.postType = PostTypeConst.Post;
    }
    if (postParams.postType === PostTypeConst.Post) {
      // only 'post' supports categories and tags
      if (matterData.categories) {
        postParams.categories = normalizeCategories(matterData.categories)
          ?? this.profile.lastSelectedCategories;
      }
      if (matterData.tags) {
        postParams.tags = normalizeTags(matterData.tags);
      }
    }
    if (matterData.excerpt && isString(matterData.excerpt)) {
      postParams.excerpt = matterData.excerpt;
    }
    if (matterData.slug && isString(matterData.slug)) {
      postParams.slug = matterData.slug;
    }
    if (matterData.date && isString(matterData.date)) {
      postParams.date = matterData.date;
    }
    return postParams;
  }

}

const MEDIA_CACHE_MAX_ENTRIES = 1000;

/**
 * Normalizes the categories from the frontmatter into term ids.
 *
 * Returns `undefined` if the value cannot be normalized.
 */
function normalizeCategories(value: SafeAny): number[] | undefined {
  const values = isArray(value) ? value : [ value ];
  const result: number[] = [];
  for (const it of values) {
    const id = typeof it === 'number' ? it : Number(it);
    if (Number.isFinite(id) && id > 0) {
      result.push(id);
    }
  }
  return result.length > 0 ? result : undefined;
}

/**
 * Normalizes the tags from the frontmatter into tag names.
 *
 * Tags could be a string (`tag1, tag2`), a number or a list.
 */
function normalizeTags(value: SafeAny): string[] {
  const values = isArray(value) ? value : isString(value) ? value.split(/[,\n]/) : [ value ];
  return values
    .map(it => String(it).trim())
    .filter(it => it.length > 0);
}

/**
 * Builds the replacement of a media reference with the WordPress URL.
 */
function buildMediaReplacement(ref: MediaRef, file: TFile, url: string): string {
  const fragment = ref.src.indexOf('#');
  if (fragment >= 0) url = url.split('#')[0] + ref.src.slice(fragment);
  if (ref.syntax === 'markdown-link' || ref.syntax === 'wiki-link') return markdownLinkReplacement(ref,url);
  if (!isImageFile(file)) {
    // non-image media files are linked instead of embedded
    return `[${ref.altText ?? file.name}](${url})`;
  }
  if (ref.syntax === 'wiki') {
    const suffix = ref.width
      ? (ref.height ? `|${ref.width}x${ref.height}` : `|${ref.width}`)
      : (ref.altText ? `|${ref.altText}` : '');
    return `![[${url}${suffix}]]`;
  }
  // markdown syntax
  if (ref.width) {
    // markdown image syntax cannot express the size, use wiki syntax
    return `![[${url}|${ref.height ? `${ref.width}x${ref.height}` : ref.width}]]`;
  }
  return `![${ref.altText ?? ''}](${url})`;
}
