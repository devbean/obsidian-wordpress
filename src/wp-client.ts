import { PostStatus } from './wp-api';

export enum WordPressClientReturnCode {
  OK,
  Error
}

export interface WordPressClientResult {
  code: WordPressClientReturnCode;
  data: unknown;
}

export interface WordPressPostParams {
  status: PostStatus;
  categories: number[];
}

export interface WordPressAuthParams {
  username: string;
  password: string;
}

export interface WordPressPublishParams extends WordPressAuthParams {
  title: string;
  content: string;
  postParams: WordPressPostParams;
}

export interface WordPressClient {

  /**
   * Creates a new post to WordPress.
   *
   * @param defaultPostParams Use this parameter instead of popup publish modal if this is not undefined.
   */
  newPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult>;

  /**
   * Checks if the login certificate is OK.
   * @param certificate
   */
  checkUser(certificate: WordPressAuthParams): Promise<WordPressClientResult>;

}
