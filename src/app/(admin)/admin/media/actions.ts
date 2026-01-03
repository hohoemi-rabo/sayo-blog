'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export interface MediaFile {
  id: string
  name: string
  url: string
  size: number
  createdAt: string
  path: string
}

export async function listMediaFiles(): Promise<{ files: MediaFile[]; error?: string }> {
  const supabase = createAdminClient()

  try {
    // Use RPC function to query storage.objects directly
    const { data: objects, error: queryError } = await supabase
      .rpc('list_storage_objects', { bucket_name: 'thumbnails' })

    if (queryError) {
      console.error('RPC query failed:', queryError)
      // Fallback to storage API if RPC fails
      return await listMediaFilesViaStorageAPI(supabase)
    }

    const allFiles: MediaFile[] = (objects || []).map((obj: { id: string; name: string; created_at: string; size: number }) => {
      const { data: urlData } = supabase.storage
        .from('thumbnails')
        .getPublicUrl(obj.name)

      return {
        id: obj.id,
        name: obj.name.split('/').pop() || obj.name,
        url: urlData.publicUrl,
        size: obj.size || 0,
        createdAt: obj.created_at || '',
        path: obj.name,
      }
    })

    return { files: allFiles }
  } catch (error) {
    console.error('Failed to list media files:', error)
    return { files: [], error: 'ファイル一覧の取得に失敗しました' }
  }
}

async function listMediaFilesViaStorageAPI(supabase: ReturnType<typeof createAdminClient>): Promise<{ files: MediaFile[]; error?: string }> {
  const allFiles: MediaFile[] = []

  // List year folders
  const { data: yearFolders } = await supabase.storage
    .from('thumbnails')
    .list('', { limit: 100, sortBy: { column: 'name', order: 'desc' } })

  for (const yearFolder of yearFolders || []) {
    // Skip files at root level (if any) - we only want folders
    if (!yearFolder.id) {
      // This is a folder, list its contents (month folders)
      const { data: monthFolders } = await supabase.storage
        .from('thumbnails')
        .list(yearFolder.name, { limit: 100 })

      for (const monthFolder of monthFolders || []) {
        if (!monthFolder.id) {
          // This is a folder, list its contents (files)
          const { data: files } = await supabase.storage
            .from('thumbnails')
            .list(`${yearFolder.name}/${monthFolder.name}`, { limit: 100 })

          for (const file of files || []) {
            if (file.id) {
              const path = `${yearFolder.name}/${monthFolder.name}/${file.name}`
              const { data: urlData } = supabase.storage
                .from('thumbnails')
                .getPublicUrl(path)

              allFiles.push({
                id: file.id,
                name: file.name,
                url: urlData.publicUrl,
                size: file.metadata?.size || 0,
                createdAt: file.created_at || '',
                path,
              })
            }
          }
        }
      }
    }
  }

  // Sort by creation date (newest first)
  allFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return { files: allFiles }
}

export async function checkMediaUsage(url: string): Promise<{ usedByPosts: number; postTitles: string[] }> {
  const supabase = createAdminClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, title')
    .eq('thumbnail_url', url)

  return {
    usedByPosts: posts?.length || 0,
    postTitles: posts?.map(p => p.title) || []
  }
}

export async function deleteMediaFile(path: string, url: string): Promise<{ success: boolean; error?: string; clearedPosts?: number }> {
  const supabase = createAdminClient()

  try {
    // Check if image is used by any posts
    const { usedByPosts } = await checkMediaUsage(url)

    // Clear thumbnail_url from posts that use this image
    if (usedByPosts > 0) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ thumbnail_url: null })
        .eq('thumbnail_url', url)

      if (updateError) {
        console.error('Failed to clear post thumbnails:', updateError)
      }
    }

    // Delete from storage
    const { error } = await supabase.storage.from('thumbnails').remove([path])

    if (error) {
      throw error
    }

    revalidatePath('/admin/media')
    revalidatePath('/admin/posts')
    return { success: true, clearedPosts: usedByPosts }
  } catch (error) {
    console.error('Failed to delete media file:', error)
    return { success: false, error: '削除に失敗しました' }
  }
}

export async function deleteMultipleMediaFiles(files: { path: string; url: string }[]): Promise<{ success: boolean; error?: string; clearedPosts?: number }> {
  const supabase = createAdminClient()

  try {
    // Get all URLs to check and clear
    const urls = files.map(f => f.url)

    // Clear thumbnail_url from posts that use any of these images
    let totalCleared = 0
    for (const url of urls) {
      const { usedByPosts } = await checkMediaUsage(url)
      if (usedByPosts > 0) {
        await supabase
          .from('posts')
          .update({ thumbnail_url: null })
          .eq('thumbnail_url', url)
        totalCleared += usedByPosts
      }
    }

    // Delete from storage
    const paths = files.map(f => f.path)
    const { error } = await supabase.storage.from('thumbnails').remove(paths)

    if (error) {
      throw error
    }

    revalidatePath('/admin/media')
    revalidatePath('/admin/posts')
    return { success: true, clearedPosts: totalCleared }
  } catch (error) {
    console.error('Failed to delete media files:', error)
    return { success: false, error: '削除に失敗しました' }
  }
}
