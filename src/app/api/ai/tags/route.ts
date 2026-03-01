import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('ai_prompt_tags')
    .select('id, label, prompt, tag_type')
    .eq('is_active', true)
    .order('order_num')
    .limit(12)

  if (error) {
    console.error('Failed to fetch prompt tags:', error)
    return Response.json({ tags: [] })
  }

  return Response.json({ tags: data || [] })
}
