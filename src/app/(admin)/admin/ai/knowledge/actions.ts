'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { KnowledgeMetadata } from '@/lib/types'

// Types for knowledge list items
export interface KnowledgeListItem {
  id: string | null // null if knowledge not created yet
  post_id: string
  post_title: string
  post_slug: string
  post_updated_at: string
  category_slug: string | null
  metadata: KnowledgeMetadata | null
  content: string | null
  has_embedding: boolean
  is_active: boolean | null
  knowledge_updated_at: string | null
  needs_update: boolean
}

export interface KnowledgeDetail {
  id: string
  post_id: string
  slug: string
  metadata: KnowledgeMetadata
  content: string
  is_active: boolean
  created_at: string
  updated_at: string
  post: {
    id: string
    title: string
    slug: string
    content: string
    updated_at: string
  }
}

export type KnowledgeFormData = {
  post_id: string
  slug: string
  metadata: KnowledgeMetadata
  content: string
  is_active: boolean
}

// LIST: Get all published posts with their knowledge status
export async function getKnowledgeList(filter?: {
  status?: string
  needsUpdate?: boolean
}): Promise<{ items: KnowledgeListItem[]; totalPosts: number; totalKnowledge: number }> {
  const supabase = createAdminClient()

  // Get all published posts with their categories
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      slug,
      updated_at,
      post_categories(
        categories(slug)
      )
    `)
    .eq('is_published', true)
    .order('updated_at', { ascending: false })

  if (postsError) {
    console.error('Error fetching posts:', postsError)
    return { items: [], totalPosts: 0, totalKnowledge: 0 }
  }

  // Get all knowledge records
  const { data: knowledgeRecords, error: knowledgeError } = await supabase
    .from('article_knowledge')
    .select('id, post_id, metadata, content, embedding, is_active, updated_at')

  if (knowledgeError) {
    console.error('Error fetching knowledge:', knowledgeError)
    return { items: [], totalPosts: 0, totalKnowledge: 0 }
  }

  // Build a map of knowledge by post_id
  const knowledgeMap = new Map(
    (knowledgeRecords || []).map((k) => [k.post_id, k])
  )

  type PostData = {
    id: string
    title: string
    slug: string
    updated_at: string
    post_categories: Array<{ categories: { slug: string } | null }> | null
  }

  // Combine into list items
  const items: KnowledgeListItem[] = (posts as unknown as PostData[]).map((post) => {
    const knowledge = knowledgeMap.get(post.id)
    const categorySlug = post.post_categories?.[0]?.categories?.slug || null

    return {
      id: knowledge?.id || null,
      post_id: post.id,
      post_title: post.title,
      post_slug: post.slug,
      post_updated_at: post.updated_at,
      category_slug: categorySlug,
      metadata: knowledge?.metadata as KnowledgeMetadata | null,
      content: knowledge?.content || null,
      has_embedding: knowledge?.embedding != null,
      is_active: knowledge?.is_active ?? null,
      knowledge_updated_at: knowledge?.updated_at || null,
      needs_update: knowledge
        ? new Date(post.updated_at) > new Date(knowledge.updated_at)
        : false,
    }
  })

  const totalPosts = items.length
  const totalKnowledge = items.filter((item) => item.id !== null).length

  // Apply filters
  let filtered = items
  if (filter?.status === 'active') {
    filtered = filtered.filter((item) => item.is_active === true)
  } else if (filter?.status === 'inactive') {
    filtered = filtered.filter((item) => item.is_active === false)
  } else if (filter?.status === 'none') {
    filtered = filtered.filter((item) => item.id === null)
  }

  if (filter?.needsUpdate) {
    filtered = filtered.filter((item) => item.needs_update)
  }

  return { items: filtered, totalPosts, totalKnowledge }
}

// GET: Single knowledge record with post data
export async function getKnowledge(id: string): Promise<KnowledgeDetail | null> {
  const supabase = createAdminClient()

  const { data: knowledge, error } = await supabase
    .from('article_knowledge')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching knowledge:', error)
    return null
  }

  // Get the associated post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, title, slug, content, updated_at')
    .eq('id', knowledge.post_id)
    .single()

  if (postError) {
    console.error('Error fetching post:', postError)
    return null
  }

  return {
    id: knowledge.id,
    post_id: knowledge.post_id,
    slug: knowledge.slug,
    metadata: knowledge.metadata as KnowledgeMetadata,
    content: knowledge.content,
    is_active: knowledge.is_active,
    created_at: knowledge.created_at,
    updated_at: knowledge.updated_at,
    post,
  }
}

// CREATE
export async function createKnowledge(data: KnowledgeFormData) {
  const supabase = createAdminClient()

  const { data: knowledge, error } = await supabase
    .from('article_knowledge')
    .insert({
      post_id: data.post_id,
      slug: data.slug,
      metadata: data.metadata,
      content: data.content,
      is_active: data.is_active,
    })
    .select()
    .single()

  if (error) {
    console.error('Knowledge creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/knowledge')

  return { success: true, knowledge }
}

// UPDATE
export async function updateKnowledge(
  id: string,
  data: { metadata: KnowledgeMetadata; content: string; is_active: boolean }
) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('article_knowledge')
    .update({
      metadata: data.metadata,
      content: data.content,
      is_active: data.is_active,
    })
    .eq('id', id)

  if (error) {
    console.error('Knowledge update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/knowledge')
  revalidatePath(`/admin/ai/knowledge/${id}`)

  return { success: true }
}

// DELETE
export async function deleteKnowledge(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('article_knowledge')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Knowledge delete error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/knowledge')

  return { success: true }
}

// TOGGLE ACTIVE
export async function toggleKnowledgeActive(ids: string[], is_active: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('article_knowledge')
    .update({ is_active })
    .in('id', ids)

  if (error) {
    console.error('Knowledge toggle error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/knowledge')

  return { success: true }
}

// GET POSTS WITHOUT KNOWLEDGE (for new knowledge creation)
export async function getPostsWithoutKnowledge() {
  const supabase = createAdminClient()

  // Get all post_ids that already have knowledge
  const { data: existingKnowledge } = await supabase
    .from('article_knowledge')
    .select('post_id')

  const existingPostIds = (existingKnowledge || []).map((k) => k.post_id)

  // Get published posts that don't have knowledge yet
  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      slug,
      content,
      published_at,
      updated_at,
      post_categories(
        categories(slug, name)
      ),
      post_hashtags(
        hashtags(name, slug)
      )
    `)
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (existingPostIds.length > 0) {
    query = query.not('id', 'in', `(${existingPostIds.join(',')})`)
  }

  const { data: posts, error } = await query

  if (error) {
    console.error('Error fetching posts without knowledge:', error)
    return []
  }

  return posts || []
}

// GET CATEGORIES (for form select)
export async function getCategories() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('order_num')

  if (error) {
    console.error('Categories fetch error:', error)
    return []
  }

  return data || []
}
