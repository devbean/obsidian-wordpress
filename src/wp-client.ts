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
}

export interface WordPressClient {

  /**
   * Creates a new post to WordPress.
   *
   * @param defaultPostParams Use this parameter instead of popup publish modal if this is not undefined.
   */
  newPost(defaultPostParams?: WordPressPostParams): Promise<WordPressClientResult>;

}
