/**
 * Database Types
 * These types will be auto-generated once database schema is created
 * Run: npx supabase gen types typescript --project-id nkvohswifpmarobyrnbe > src/lib/database.types.ts
 */

// Post types
export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  thumbnail_url?: string
  view_count: number
  published_at?: string
  updated_at: string
  is_published: boolean
  created_at: string
}

// Category types
export interface Category {
  id: string
  name: string
  slug: string
  parent_id?: string | null
  order_num: number
  description?: string
  image_url?: string
  meta_title?: string
  meta_description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Hashtag types
export interface Hashtag {
  id: string
  name: string
  slug: string
  count: number
  created_at: string
  updated_at: string
}

// Reaction types (Phase 2)
export interface Reaction {
  id: string
  post_id: string
  reaction_type: 'light' | 'heart' | 'thumbs' | 'fire'
  count: number
  created_at: string
  updated_at: string
}

// Junction table types
export interface PostCategory {
  post_id: string
  category_id: string
  created_at: string
}

export interface PostHashtag {
  post_id: string
  hashtag_id: string
  created_at: string
}

// Extended types with relations
export interface PostWithRelations extends Post {
  post_categories: Array<{
    categories: Category
  }>
  post_hashtags: Array<{
    hashtags: Hashtag
  }>
}

// Component prop types
export interface PostCardProps {
  post: PostWithRelations
  priority?: boolean
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
}

export interface FilterBarProps {
  prefecture?: string
  category?: string
  hashtags?: string
  sort?: 'latest' | 'popular'
}

// Utility types
export type SortOption = 'latest' | 'popular'

export interface SearchParams {
  prefecture?: string
  category?: string
  hashtags?: string
  sort?: SortOption
  page?: string
  q?: string
}
