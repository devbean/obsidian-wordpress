export const enum PostStatus {
  Draft = 'draft',
  Publish = 'publish',
  // Future = 'future'
}

export const enum CommentStatus {
  Open = 'open',
  Closed = 'closed'
}

export const enum PostType {
  Post = 'post',
  Page = 'page',
}

export interface Term {
  id: string;
  name: string;
  slug: string;
  taxonomy: string;
  description: string;
  parent?: string;
  count: number;
}
