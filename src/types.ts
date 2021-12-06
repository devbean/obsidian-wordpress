export interface WordPressPost {
  post_type: 'post';
  post_status: 'new' | 'publish' | 'pending' | 'draft' | 'auto-draft' | 'future' | 'private' | 'inherit' | 'trash';
  post_title: string;
  post_content: string;
}
