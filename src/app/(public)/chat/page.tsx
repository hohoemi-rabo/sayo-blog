import { cookies } from 'next/headers'
import { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { SITE_CONFIG } from '@/lib/site-config'
import { ChatPage } from '@/components/ai/ChatPage'

export const metadata: Metadata = {
  title: `AI Chat | ${SITE_CONFIG.name}`,
  description: '飯田・下伊那のことなら、AIナビゲーター FUNE になんでも聞いてください。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/chat`,
  },
}

export const dynamic = 'force-dynamic'

export default async function ChatRoute() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get('admin_auth')?.value === 'authenticated'

  if (isAdmin) {
    // Admin: 実際のAIチャットを表示
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

    return (
      <div className="h-[calc(100vh-5rem)]">
        <ChatPage tags={tags} />
      </div>
    )
  }

  // 一般ユーザー: ティーザー画面
  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-lg">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>

        <h1 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary mb-4">
          AI Chat
        </h1>

        <p className="text-lg text-text-secondary font-noto-serif-jp leading-relaxed mb-3">
          飯田・下伊那のことなら、<br className="sm:hidden" />
          なんでも聞ける AI ナビゲーター
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-noto-sans-jp text-sm mb-8">
          <Sparkles className="w-4 h-4" />
          現在開発中です。お楽しみに！
        </div>

        <div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-noto-sans-jp hover:bg-primary hover:text-white transition-colors duration-200"
          >
            ブログ記事を読む
          </Link>
        </div>
      </div>
    </section>
  )
}
