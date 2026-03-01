'use server'

import { createAdminClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export type TagFormData = {
  label: string
  prompt: string
  tag_type: 'purpose' | 'area' | 'scene'
  order_num: number
  is_active: boolean
}

export async function getTags() {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_prompt_tags')
    .select('*')
    .order('order_num')

  if (error) {
    console.error('Tags fetch error:', error)
    return []
  }

  return data || []
}

export async function getTag(id: string) {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ai_prompt_tags')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Tag fetch error:', error)
    return null
  }

  return data
}

export async function createTag(data: TagFormData) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('ai_prompt_tags').insert({
    label: data.label,
    prompt: data.prompt,
    tag_type: data.tag_type,
    order_num: data.order_num,
    is_active: data.is_active,
  })

  if (error) {
    console.error('Tag creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/tags')
  revalidatePath('/')

  return { success: true }
}

export async function updateTag(id: string, data: TagFormData) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ai_prompt_tags')
    .update({
      label: data.label,
      prompt: data.prompt,
      tag_type: data.tag_type,
      order_num: data.order_num,
      is_active: data.is_active,
    })
    .eq('id', id)

  if (error) {
    console.error('Tag update error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/tags')
  revalidatePath(`/admin/ai/tags/${id}`)
  revalidatePath('/')

  return { success: true }
}

export async function deleteTag(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase.from('ai_prompt_tags').delete().eq('id', id)

  if (error) {
    console.error('Tag delete error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/tags')
  revalidatePath('/')

  return { success: true }
}

export async function toggleTagActive(id: string, is_active: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ai_prompt_tags')
    .update({ is_active })
    .eq('id', id)

  if (error) {
    console.error('Tag toggle error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/tags')
  revalidatePath('/')

  return { success: true }
}

export async function bulkCreateTags(
  tags: Array<{ label: string; prompt: string; tag_type: string }>
) {
  const supabase = createAdminClient()

  // Get max order_num
  const { data: existing } = await supabase
    .from('ai_prompt_tags')
    .select('order_num')
    .order('order_num', { ascending: false })
    .limit(1)

  let nextOrder = (existing?.[0]?.order_num ?? 0) + 1

  const rows = tags.map((t) => ({
    label: t.label,
    prompt: t.prompt,
    tag_type: t.tag_type,
    order_num: nextOrder++,
    is_active: true,
  }))

  const { error } = await supabase.from('ai_prompt_tags').insert(rows)

  if (error) {
    console.error('Bulk tag creation error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/ai/tags')
  revalidatePath('/')

  return { success: true, count: rows.length }
}
