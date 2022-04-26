export const enum PostStatus {
  Draft = 'draft',
  Publish = 'publish',
  // Future = 'future'
}

export interface Term {
  id: string;
  name: string;
  slug: string;
  taxonomy: string;
  description: string;
  parent: string;
  count: number;
}
