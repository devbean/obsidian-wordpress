export interface WordPressPost {
  post_type: 'post';
  post_status: 'new' | 'publish' | 'pending' | 'draft' | 'auto-draft' | 'future' | 'private' | 'inherit' | 'trash';
  post_title: string;
  post_content: string;
}

export function createWordPressPost(post: Partial<WordPressPost>): WordPressPost {
  return {
    post_type: post.post_type ?? 'post',
    post_status: post.post_status ?? 'draft',
    post_title: post.post_title ?? '',
    post_content: post.post_content ?? '',
  };
}
