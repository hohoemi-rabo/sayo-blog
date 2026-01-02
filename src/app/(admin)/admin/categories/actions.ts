'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type CategoryFormData = {
  name: string
  slug: string
  description: string | null
  order_num: number
}

export async function getCategories() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      description,
      order_num,
      post_categories(count)
    `)
    .order('order_num')

  if (error) {
    console.error('Categories fetch error:', error)
    return []
  }

  return data || []
}

export async function getCategory(id: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Category fetch error:', error)
    return null
  }

  return data
}

export async function createCategory(data: CategoryFormData) {
  const supabase = createAdminClient()

  const { data: category, error } = await supabase
    .from('categories')
    .insert({
      name: data.name,
      slug: data.slug,
      description: data.description,
      order_num: data.order_num,
    })
    .select()
    .single()

  if (error) {
    console.error('Category creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/')

  return { success: true, category }
}

export async function updateCategory(id: string, data: CategoryFormData) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('categories')
    .update({
      name: data.name,
      slug: data.slug,
      description: data.description,
      order_num: data.order_num,
    })
    .eq('id', id)

  if (error) {
    console.error('Category update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/categories')
  revalidatePath(`/admin/categories/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient()

  // Check if category has posts
  const { count } = await supabase
    .from('post_categories')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', id)

  if (count && count > 0) {
    return {
      success: false,
      error: `このカテゴリには ${count} 件の記事があります。先に記事を移動または削除してください。`,
    }
  }

  const { error } = await supabase.from('categories').delete().eq('id', id)

  if (error) {
    console.error('Category delete error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/')

  return { success: true }
}
