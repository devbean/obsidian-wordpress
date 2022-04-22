export const enum PostStatus {
  Draft = 'draft',
  Publish = 'publish',
  // Future = 'future'
}

export interface Term {
  term_id: string;
  name: string;
  slug: string;
  term_group: string;
  taxonomy: string;
  description: string;
  parent: string;
  count: string;
}
