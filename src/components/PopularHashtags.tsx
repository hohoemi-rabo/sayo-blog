import { createClient } from '@/lib/supabase'
import { calculateFontSize } from '@/lib/hashtag-utils'
import { Hash } from 'lucide-react'
import HashtagLink from './HashtagLink'

export default async function PopularHashtags() {
  const supabase = createClient()

  // Fetch top 30 popular hashtags
  const { data: hashtags } = await supabase
    .from('hashtags')
    .select('name, slug, count')
    .gt('count', 0)
    .order('count', { ascending: false })
    .limit(30)

  if (!hashtags || hashtags.length === 0) {
    return null
  }

  // Calculate min and max counts for sizing
  const counts = hashtags.map((h) => h.count)
  const minCount = Math.min(...counts)
  const maxCount = Math.max(...counts)

  return (
    <section className="bg-background-dark/5 backdrop-blur-sm rounded-xl p-8 md:p-12 border border-border-decorative animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Hash className="w-6 h-6 text-primary" />
          <h2 className="text-2xl md:text-3xl font-playfair font-bold text-text-primary text-center">
            人気のハッシュタグ
          </h2>
          <Hash className="w-6 h-6 text-primary" />
        </div>

        {/* Hashtag Cloud */}
        <div className="flex flex-wrap gap-3 justify-center items-center">
          {hashtags.map((hashtag, index) => {
            const fontSize = calculateFontSize(hashtag.count, minCount, maxCount)

            return (
              <HashtagLink
                key={hashtag.slug}
                slug={hashtag.slug}
                name={hashtag.name}
                count={hashtag.count}
                fontSize={fontSize}
                index={index}
              />
            )
          })}
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-text-secondary mt-8 font-noto-sans-jp">
          タグをクリックして関連記事を探す
        </p>
      </div>
    </section>
  )
}
