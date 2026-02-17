import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase'
import { SITE_CONFIG } from '@/lib/site-config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient()

  // Fetch all published posts with their categories
  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      slug,
      updated_at,
      post_categories!inner(
        categories!inner(slug)
      )
    `
    )
    .eq('is_published', true)

  type PostData = {
    slug: string
    updated_at: string
    post_categories: Array<{
      categories: { slug: string }
    }>
  }

  // Generate post URLs
  const postUrls: MetadataRoute.Sitemap =
    (posts as unknown as PostData[])?.map((post) => {
      const categorySlug = post.post_categories[0]?.categories.slug

      return {
        url: `${SITE_CONFIG.url}/${categorySlug}/${post.slug}/`,
        lastModified: new Date(post.updated_at),
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
      url: `${SITE_CONFIG.url}/?category=${category.slug}`,
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
    ...categoryUrls,
    ...postUrls,
  ]
}
