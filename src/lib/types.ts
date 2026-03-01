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

// ============================================================
// Phase 2: AI Chat types
// ============================================================

// AI Knowledge
export interface KnowledgeSpot {
  name: string
  address?: string
  phone?: string
  hours?: string
  note?: string
}

export interface KnowledgeMetadata {
  title: string
  category: string
  hashtags: string[]
  published_at: string
  area: string
  summary: string
  keywords: string[]
  spots: KnowledgeSpot[]
}

export interface ArticleKnowledge {
  id: string
  post_id: string
  slug: string
  metadata: KnowledgeMetadata
  content: string
  embedding?: number[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// AI Prompt Tags
export interface AiPromptTag {
  id: string
  label: string
  prompt: string
  tag_type: 'purpose' | 'area' | 'scene'
  order_num: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// AI Usage
export interface AiUsageLog {
  id: string
  session_id: string
  query: string
  token_input?: number
  token_output?: number
  matched_articles?: string[]
  created_at: string
}

export interface AiUsageLimit {
  id: string
  limit_type: 'daily_user' | 'monthly_site'
  limit_value: number
  current_value: number
  reset_at?: string
  updated_at: string
}

// AI Chat types
export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ArticleCard {
  slug: string
  title: string
  thumbnail_url: string | null
  excerpt: string | null
  category: string
}

export interface SpotInfo {
  name: string
  address?: string
  phone?: string
  hours?: string
  mapUrl?: string
}

export type ChatEventType =
  | 'text'
  | 'articles'
  | 'spots'
  | 'suggestions'
  | 'meta'
  | 'done'
  | 'error'

// UI Chat types (for ChatPage component)
export interface UIChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  articles?: ArticleCard[]
  spots?: SpotInfo[]
  suggestions?: string[]
  isStreaming?: boolean
  isError?: boolean
  timestamp: number
}

export interface ChatStreamEvent {
  type: ChatEventType
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any
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
