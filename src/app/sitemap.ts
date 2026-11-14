import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'
import { SITE_CONFIG } from '@/lib/site-config'
import { articlePath } from '@/lib/seo-utils'
import { contentModifiedAt } from '@/lib/post-updates'

// 何もしないとデプロイ時に 1 回作ったきりになり、公開した記事が次のデプロイまで載らない。
// 記事の保存・削除時は posts/actions.ts が作り直すので、これは取りこぼしの保険。
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  // Fetch all published posts with their categories
  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      slug,
      updated_at,
      published_at,
      post_updates(updated_on),
      post_categories!inner(
        categories!inner(slug)
      )
    `
    )
    .eq('is_published', true)

  type PostData = {
    slug: string
    updated_at: string
    published_at: string | null
    post_updates: Array<{ updated_on: string }> | null
    post_categories: Array<{
      categories: { slug: string }
    }>
  }

  // Generate post URLs
  const postUrls: MetadataRoute.Sitemap =
    (posts as unknown as PostData[])?.map((post) => {
      const categorySlug = post.post_categories[0]?.categories.slug

      return {
        url: `${SITE_CONFIG.url}${articlePath(categorySlug, post.slug)}`,
        // 記事ページの「最終更新」・dateModified と同じ (更新履歴の最新日 → 無ければ公開日時)。
        // 誤字直しでも変わる updated_at を使うと、Google がサイトの lastmod を信用しなくなる
        lastModified: new Date(
          contentModifiedAt(post.post_updates ?? [], post.published_at, post.updated_at)
        ),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }
    }) || []

  // Fetch all categories
  const { data: categories } = await supabase
    .from('categories')
    .select('slug, updated_at')
    .eq('is_active', true)

  const categoryUrls: MetadataRoute.Sitemap =
    categories?.map((category) => ({
      // /blog?category= は canonical が /blog なので載せない (Search Console で「代替ページ」になる)。
      // カテゴリ一覧 /{slug} は自分自身が canonical
      url: `${SITE_CONFIG.url}/${category.slug}`,
      lastModified: new Date(category.updated_at),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })) || []

  return [
    {
      url: SITE_CONFIG.url,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_CONFIG.url}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${SITE_CONFIG.url}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_CONFIG.url}/request/post`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_CONFIG.url}/request/post/guide`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_CONFIG.url}/request/interview`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    ...categoryUrls,
    ...postUrls,
  ]
}
