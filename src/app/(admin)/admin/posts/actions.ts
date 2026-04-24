'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { triggerIgAutoGenerate } from '@/lib/ig-auto-generator'

export type PostFormData = {
  title: string
  slug: string
  content: string
  excerpt: string
  thumbnail_url: string | null
  category_id: string | null
  hashtag_ids: string[]
  published_at: string | null
  is_published: boolean
}

export async function createPost(data: PostFormData) {
  const supabase = createAdminClient()

  // Insert post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .insert({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      thumbnail_url: data.thumbnail_url,
      published_at: data.published_at,
      is_published: data.is_published,
      view_count: 0,
    })
    .select()
    .single()

  if (postError) {
    console.error('Post creation error:', postError)
    return { success: false, error: postError.message }
  }

  // Link category
  if (data.category_id) {
    const { error: catError } = await supabase
      .from('post_categories')
      .insert({
        post_id: post.id,
        category_id: data.category_id,
      })

    if (catError) {
      console.error('Category link error:', catError)
    }
  }

  // Link hashtags
  if (data.hashtag_ids.length > 0) {
    const hashtagLinks = data.hashtag_ids.map((hashtagId) => ({
      post_id: post.id,
      hashtag_id: hashtagId,
    }))

    const { error: tagError } = await supabase
      .from('post_hashtags')
      .insert(hashtagLinks)

    if (tagError) {
      console.error('Hashtag link error:', tagError)
    }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')

  if (data.is_published && post?.id) {
    const newPostId = post.id as string
    after(() => triggerIgAutoGenerate(newPostId))
  }

  return { success: true, post }
}

export async function updatePost(id: string, data: PostFormData) {
  const supabase = createAdminClient()

  // Capture the current is_published so we can detect a false -> true transition
  // and trigger IG auto-generation after the save succeeds.
  const { data: current } = await supabase
    .from('posts')
    .select('is_published')
    .eq('id', id)
    .maybeSingle()
  const wasPublished = current?.is_published === true

  // Update post
  const { error: postError } = await supabase
    .from('posts')
    .update({
      title: data.title,
      slug: data.slug,
      content: data.content,
      excerpt: data.excerpt,
      thumbnail_url: data.thumbnail_url,
      published_at: data.published_at,
      is_published: data.is_published,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (postError) {
    console.error('Post update error:', postError)
    return { success: false, error: postError.message }
  }

  // Update category - delete existing and insert new
  await supabase.from('post_categories').delete().eq('post_id', id)

  if (data.category_id) {
    await supabase.from('post_categories').insert({
      post_id: id,
      category_id: data.category_id,
    })
  }

  // Update hashtags - delete existing and insert new
  await supabase.from('post_hashtags').delete().eq('post_id', id)

  if (data.hashtag_ids.length > 0) {
    const hashtagLinks = data.hashtag_ids.map((hashtagId) => ({
      post_id: id,
      hashtag_id: hashtagId,
    }))
    await supabase.from('post_hashtags').insert(hashtagLinks)
  }

  revalidatePath('/admin/posts')
  revalidatePath(`/admin/posts/${id}`)
  revalidatePath('/')

  if (!wasPublished && data.is_published) {
    after(() => triggerIgAutoGenerate(id))
  }

  return { success: true }
}

export async function deletePost(id: string) {
  const supabase = createAdminClient()

  // Delete related data first (due to foreign key constraints)
  await supabase.from('post_categories').delete().eq('post_id', id)
  await supabase.from('post_hashtags').delete().eq('post_id', id)

  // Delete post
  const { error } = await supabase.from('posts').delete().eq('id', id)

  if (error) {
    console.error('Post delete error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')

  return { success: true }
}

export async function getPost(id: string) {
  const supabase = createAdminClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      post_categories(
        categories(id, name, slug)
      ),
      post_hashtags(
        hashtags(id, name, slug)
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Post fetch error:', error)
    return null
  }

  return post
}

export async function getPosts(filter?: { category?: string; status?: string }) {
  const supabase = createAdminClient()

  let query = supabase
    .from('posts')
    .select(`
      id,
      title,
      slug,
      excerpt,
      thumbnail_url,
      is_published,
      is_featured,
      published_at,
      view_count,
      created_at,
      post_categories(
        categories(id, name, slug)
      )
    `, { count: 'exact' })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (filter?.status === 'published') {
    query = query.eq('is_published', true)
  } else if (filter?.status === 'draft') {
    query = query.eq('is_published', false)
  }

  const { data: posts, error, count } = await query

  if (error) {
    console.error('Posts fetch error:', error)
    return { posts: [], count: 0 }
  }

  // Filter by category if specified
  let filteredPosts = posts
  if (filter?.category) {
    filteredPosts = posts?.filter((post) => {
      const postCategories = post.post_categories as unknown as Array<{ categories: { slug: string } | null }> | null
      return postCategories?.some(
        (pc) => pc.categories?.slug === filter.category
      )
    }) || []
  }

  return { posts: filteredPosts || [], count: count || 0 }
}

export async function toggleFeatured(postId: string, currentValue: boolean) {
  const supabase = createAdminClient()

  // おすすめに追加する場合、既に6件あるかチェック
  if (!currentValue) {
    const { count } = await supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('is_featured', true)

    if (count !== null && count >= 6) {
      return { success: false, error: 'おすすめ記事は最大6件までです' }
    }
  }

  const { error } = await supabase
    .from('posts')
    .update({ is_featured: !currentValue })
    .eq('id', postId)

  if (error) {
    console.error('Toggle featured error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/posts')
  revalidatePath('/')

  return { success: true }
}

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

export async function getHashtags() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('hashtags')
    .select('id, name, slug')
    .order('name')

  if (error) {
    console.error('Hashtags fetch error:', error)
    return []
  }

  return data || []
}

export interface ImportedOrigin {
  ig_username: string
  display_name: string
  ig_post_url: string | null
}

/**
 * Look up the Instagram source post that this blog post was generated from.
 * Phase 3B populates `ig_imported_posts.generated_post_id`; for now this
 * returns null for every post that was authored manually.
 */
export async function getImportedOrigin(
  postId: string
): Promise<ImportedOrigin | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ig_imported_posts')
    .select(
      `
      ig_post_url,
      source:ig_sources(ig_username, display_name)
    `
    )
    .eq('generated_post_id', postId)
    .maybeSingle()

  if (error) {
    console.error('Imported origin fetch error:', error)
    return null
  }
  if (!data) return null

  const rawSource = (data as { source?: unknown }).source
  let src: { ig_username?: string; display_name?: string } | undefined
  if (Array.isArray(rawSource)) {
    src = rawSource[0] as typeof src
  } else if (rawSource && typeof rawSource === 'object') {
    src = rawSource as typeof src
  }
  if (!src?.ig_username) return null

  return {
    ig_username: src.ig_username,
    display_name: src.display_name ?? src.ig_username,
    ig_post_url: (data as { ig_post_url?: string | null }).ig_post_url ?? null,
  }
}
