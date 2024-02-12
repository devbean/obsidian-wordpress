export const enum PostStatus {
  Draft = 'draft',
  Publish = 'publish',
  Private = 'private',
  Future = 'future'
}

export const enum CommentStatus {
  Open = 'open',
  Closed = 'closed'
}

export const enum PostTypeConst {
  Post = 'post',
  Page = 'page',
}

export interface PostTypeObj {
  slug: string;
  name: string;
}
export type PostType = string | PostTypeObj;

export interface Term {
  id: string;
  name: string;
  slug: string;
  taxonomy: string;
  description: string;
  parent?: string;
  count: number;
}
