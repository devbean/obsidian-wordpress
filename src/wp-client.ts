import { CommentStatus, PostStatus } from './wp-api';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: unknown;

  /**
   * Response from WordPress server.
   */
  response?: unknown;
}

export interface WordPressPostParams {
  status: PostStatus;
  commentStatus: CommentStatus;
  categories: number[];

  /**
   * WordPress post ID.
   *
   * If this is assigned, the post will be updated, otherwise created.
   */
  postId?: string;
}

export interface WordPressAuthParams {
  username: string | null;
  password: string | null;
}

export interface WordPressPublishParams extends WordPressAuthParams {
  title: string;
  content: string;
  postParams: WordPressPostParams;
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
  publishPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult>;

  /**
   * Checks if the login certificate is OK.
   * @param certificate
   */
  validateUser(certificate: WordPressAuthParams): Promise<WordPressClientResult>;

}
