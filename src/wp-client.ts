import { CommentStatus, PostStatus, PostType } from './wp-api';
import { SafeAny } from './utils';

export enum WordPressClientReturnCode {
  OK,
  Error,
  ServerInternalError,
}

interface _wpClientResult {
  /**
   * Response from WordPress server.
   */
  response?: SafeAny;

  code: WordPressClientReturnCode;
}

interface WpClientOkResult<T> extends _wpClientResult {
  code: WordPressClientReturnCode.OK;
  data: T;
}

interface WpClientErrorResult extends _wpClientResult {
  code: WordPressClientReturnCode.Error;
  error: {
    /**
     * This code could be returned from remote server
     */
    code: WordPressClientReturnCode | string;
    message: string;
  }
}

export type WordPressClientResult<T> =
  | WpClientOkResult<T>
  | WpClientErrorResult;

export interface WordPressAuthParams {
  username: string | null;
  password: string | null;
}

export interface WordPressPostParams {
  status: PostStatus;
  commentStatus: CommentStatus;
  categories: number[];
  postType: PostType;
  tags: string[];

  /**
   * Post title.
   */
  title: string;

  /**
   * Post content.
   */
  content: string;

  /**
   * WordPress post ID.
   *
   * If this is assigned, the post will be updated, otherwise created.
   */
  postId?: string;

  /**
   * WordPress profile name.
   */
  profileName?: string;

  datetime?: Date;
}

export interface WordPressPublishParams extends WordPressAuthParams {
  postParams: WordPressPostParams;
  matterData: { [p: string]: SafeAny };
}

export interface WordPressPublishResult {
  postId: string;
  categories: number[];
}

export interface WordPressMediaUploadResult {
  url: string;
}

export interface WordPressClient {

  /**
   * Publish a post to WordPress.
   *
   * If there is a `postId` in front-matter, the post will be updated,
   * otherwise, create a new one.
   *
   * @param defaultPostParams Use this parameter instead of popup publish modal if this is not undefined.
   */
  publishPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult<WordPressPublishResult>>;

  /**
   * Checks if the login certificate is OK.
   * @param certificate
   */
  validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult<boolean>>;

}
