import { createClient } from '@/lib/supabase'
import PostCard from './PostCard'
import { PostWithRelations } from '@/lib/types'

interface RelatedArticlesProps {
  postId: string
  categoryIds: string[]
  hashtagSlugs: string[]
}

export default async function RelatedArticles({
  postId,
  categoryIds,
  hashtagSlugs,
}: RelatedArticlesProps) {
  const supabase = createClient()

  // 同カテゴリの投稿IDを取得
  const { data: sameCategoryPostIds } = await supabase
    .from('post_categories')
    .select('post_id')
    .in('category_id', categoryIds)
    .neq('post_id', postId)

  const candidateIds = [
    ...new Set((sameCategoryPostIds || []).map((pc) => pc.post_id)),
  ]

  // 候補が少ない場合、最新記事で補完
  let extraIds: string[] = []
  if (candidateIds.length < 10) {
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('is_published', true)
      .neq('id', postId)
      .order('published_at', { ascending: false })
      .limit(10)

    extraIds = (recentPosts || [])
      .map((p) => p.id)
      .filter((id) => !candidateIds.includes(id))
  }

  const allCandidateIds = [...candidateIds, ...extraIds].slice(0, 20)
  if (allCandidateIds.length === 0) return null

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories!inner(categories!inner(id, name, slug, parent_id)),
      post_hashtags(hashtags(id, name, slug, count))
    `
    )
    .in('id', allCandidateIds)
    .eq('is_published', true)

  if (!posts || posts.length === 0) return null

  // 関連度スコアリング
  const scored = posts.map((post) => {
    let score = 0
    const postCategories = post.post_categories as Array<{
      categories: { id: string; slug: string }
    }>
    const postHashtags = post.post_hashtags as Array<{
      hashtags: { slug: string }
    }>

    // 同カテゴリ: +10
    if (postCategories.some((pc) => categoryIds.includes(pc.categories.id))) {
      score += 10
    }

    // 共通ハッシュタグ: +3 each
    postHashtags.forEach((ph) => {
      if (hashtagSlugs.includes(ph.hashtags.slug)) {
        score += 3
      }
    })

    return { post, score }
  })

  const relatedPosts = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.post as PostWithRelations)

  if (relatedPosts.length === 0) return null

  return (
    <section className="mt-16 pt-12 border-t border-border-decorative">
      <h2 className="text-2xl lg:text-3xl font-playfair font-bold text-text-primary mb-8">
        関連記事
      </h2>
      {/* デスクトップ: 3カラムgrid */}
      <div className="hidden md:grid md:grid-cols-3 gap-6">
        {relatedPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {/* モバイル: 横スクロール */}
      <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-4 px-4">
        {relatedPosts.map((post) => (
          <div key={post.id} className="flex-shrink-0 w-[280px] snap-start">
            <PostCard post={post} />
          </div>
        ))}
      </div>
    </section>
  )
}
