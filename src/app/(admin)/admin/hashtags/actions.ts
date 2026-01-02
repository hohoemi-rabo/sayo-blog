'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type HashtagFormData = {
  name: string
  slug: string
}

export async function getHashtags() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('hashtags')
    .select(`
      id,
      name,
      slug,
      post_hashtags(count)
    `)
    .order('name')

  if (error) {
    console.error('Hashtags fetch error:', error)
    return []
  }

  return data || []
}

export async function getHashtag(id: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('hashtags')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Hashtag fetch error:', error)
    return null
  }

  return data
}

export async function createHashtag(data: HashtagFormData) {
  const supabase = createAdminClient()

  const { data: hashtag, error } = await supabase
    .from('hashtags')
    .insert({
      name: data.name,
      slug: data.slug,
    })
    .select()
    .single()

  if (error) {
    console.error('Hashtag creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/hashtags')
  revalidatePath('/')

  return { success: true, hashtag }
}

export async function updateHashtag(id: string, data: HashtagFormData) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('hashtags')
    .update({
      name: data.name,
      slug: data.slug,
    })
    .eq('id', id)

  if (error) {
    console.error('Hashtag update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/hashtags')
  revalidatePath(`/admin/hashtags/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function deleteHashtag(id: string) {
  const supabase = createAdminClient()

  // Delete related post_hashtags first
  await supabase.from('post_hashtags').delete().eq('hashtag_id', id)

  const { error } = await supabase.from('hashtags').delete().eq('id', id)

  if (error) {
    console.error('Hashtag delete error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/hashtags')
  revalidatePath('/')

  return { success: true }
}

export async function deleteUnusedHashtags() {
  const supabase = createAdminClient()

  // Get all unused hashtags (with 0 posts)
  const { data: hashtags, error: fetchError } = await supabase
    .from('hashtags')
    .select(`
      id,
      post_hashtags(count)
    `)

  if (fetchError) {
    console.error('Fetch error:', fetchError)
    return { success: false, error: fetchError.message, count: 0 }
  }

  const unusedIds = hashtags
    ?.filter((h) => {
      const count = Array.isArray(h.post_hashtags)
        ? h.post_hashtags[0]?.count || 0
        : (h.post_hashtags as { count: number })?.count || 0
      return count === 0
    })
    .map((h) => h.id) || []

  if (unusedIds.length === 0) {
    return { success: true, count: 0 }
  }

  const { error: deleteError } = await supabase
    .from('hashtags')
    .delete()
    .in('id', unusedIds)

  if (deleteError) {
    console.error('Delete error:', deleteError)
    return { success: false, error: deleteError.message, count: 0 }
  }

  revalidatePath('/admin/hashtags')
  revalidatePath('/')

  return { success: true, count: unusedIds.length }
}
