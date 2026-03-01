import { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'
import { createClient } from '@/lib/supabase'
import { ChatPage } from '@/components/ai/ChatPage'

export const metadata: Metadata = {
  title: SITE_CONFIG.title,
  description: SITE_CONFIG.description,
  alternates: {
    canonical: SITE_CONFIG.url,
  },
}

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('ai_prompt_tags')
    .select('id, label, prompt, tag_type')
    .eq('is_active', true)
    .order('order_num')
    .limit(12)

  const tags = (data || []).map((t) => ({
    id: t.id,
    label: t.label,
    prompt: t.prompt,
    tag_type: t.tag_type,
  }))

  return <ChatPage tags={tags} />
}
