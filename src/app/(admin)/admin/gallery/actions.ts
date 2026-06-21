'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase'
import { assertAdminAuth } from '@/lib/admin-auth'

/** 管理ギャラリーの 1 行 (post_images + 所属記事の最小情報)。 */
export interface GalleryAdminImage {
  id: string
  post_id: string
  image_url: string
  caption: string | null
  alt: string | null
  position: number
  is_thumbnail: boolean
  is_visible: boolean
  is_featured: boolean
  post_is_published: boolean
  post_title: string
}

export type GalleryAdminFilter = 'all' | 'visible' | 'hidden' | 'featured'

/**
 * 全 post_images を所属記事タイトル付きで取得 (非公開記事の画像も含む / 管理用)。
 * 並び: ピン留め → 記事新着 → 記事内位置 (公開ギャラリーと同じ思想)。
 */
export async function getGalleryAdminImages(
  filter: GalleryAdminFilter = 'all'
): Promise<{ images: GalleryAdminImage[]; error?: string }> {
  const supabase = createAdminClient()

  let query = supabase
    .from('post_images')
    .select(
      `
      id, post_id, image_url, caption, alt, position,
      is_thumbnail, is_visible, is_featured, post_is_published,
      posts!inner ( title )
    `
    )
    .order('is_featured', { ascending: false })
    .order('post_published_at', { ascending: false, nullsFirst: false })
    .order('position', { ascending: true })

  if (filter === 'visible') query = query.eq('is_visible', true)
  else if (filter === 'hidden') query = query.eq('is_visible', false)
  else if (filter === 'featured') query = query.eq('is_featured', true)

  const { data, error } = await query
  if (error) {
    console.error('[gallery admin] fetch error:', error)
    return { images: [], error: '画像の取得に失敗しました' }
  }

  const images: GalleryAdminImage[] = (data ?? []).map((row) => {
    const { posts, ...rest } = row as typeof row & {
      posts: { title: string } | { title: string }[]
    }
    const post = Array.isArray(posts) ? posts[0] : posts
    return {
      ...(rest as Omit<GalleryAdminImage, 'post_title'>),
      post_title: post?.title ?? '(無題)',
    }
  })

  return { images }
}

/** 各フィルタの件数 (タブ表示用)。 */
export async function getGalleryAdminCounts(): Promise<{
  all: number
  visible: number
  hidden: number
  featured: number
}> {
  const supabase = createAdminClient()
  const head = { count: 'exact' as const, head: true }

  const [all, hidden, featured] = await Promise.all([
    supabase.from('post_images').select('id', head),
    supabase.from('post_images').select('id', head).eq('is_visible', false),
    supabase.from('post_images').select('id', head).eq('is_featured', true),
  ])

  const total = all.count ?? 0
  const hiddenCount = hidden.count ?? 0
  return {
    all: total,
    visible: total - hiddenCount,
    hidden: hiddenCount,
    featured: featured.count ?? 0,
  }
}

/** 公開ギャラリーへの表示 ON/OFF を反転。 */
export async function toggleImageVisibility(id: string, nextValue: boolean) {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('post_images')
    .update({ is_visible: nextValue })
    .eq('id', id)
  if (error) {
    console.error('[gallery admin] toggle visibility error:', error)
    return { success: false, error: '更新に失敗しました' }
  }
  revalidatePath('/admin/gallery')
  revalidatePath('/gallery')
  return { success: true }
}

/** ピン留め (優先表示) を反転。 */
export async function toggleImageFeatured(id: string, nextValue: boolean) {
  await assertAdminAuth()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('post_images')
    .update({ is_featured: nextValue })
    .eq('id', id)
  if (error) {
    console.error('[gallery admin] toggle featured error:', error)
    return { success: false, error: '更新に失敗しました' }
  }
  revalidatePath('/admin/gallery')
  revalidatePath('/gallery')
  return { success: true }
}
