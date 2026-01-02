import { createAdminClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import {
  FileText,
  Eye,
  FolderOpen,
  Hash,
  TrendingUp,
  Clock,
} from 'lucide-react'
import Link from 'next/link'

async function getDashboardStats() {
  const supabase = createAdminClient()

  // Get post counts
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  const { count: publishedPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('is_published', true)

  const draftPosts = (totalPosts || 0) - (publishedPosts || 0)

  // Get total view count
  const { data: viewData } = await supabase
    .from('posts')
    .select('view_count')

  const totalViews = viewData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0

  // Get category count
  const { count: categoryCount } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  // Get hashtag count
  const { count: hashtagCount } = await supabase
    .from('hashtags')
    .select('*', { count: 'exact', head: true })

  // Get recent posts
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('id, title, slug, is_published, published_at, view_count')
    .order('created_at', { ascending: false })
    .limit(5)

  // Get popular posts
  const { data: popularPosts } = await supabase
    .from('posts')
    .select('id, title, slug, view_count')
    .eq('is_published', true)
    .order('view_count', { ascending: false })
    .limit(5)

  // Get all categories
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('order_num')

  // Get post counts per category
  const { data: postCategoryCounts } = await supabase
    .from('post_categories')
    .select('category_id')

  // Count posts per category
  const categoryPostCounts = new Map<string, number>()
  postCategoryCounts?.forEach((pc) => {
    const count = categoryPostCounts.get(pc.category_id) || 0
    categoryPostCounts.set(pc.category_id, count + 1)
  })

  // Combine categories with their post counts
  const categoriesWithCount = (allCategories || []).map((cat) => ({
    ...cat,
    postCount: categoryPostCounts.get(cat.id) || 0,
  }))

  return {
    totalPosts: totalPosts || 0,
    publishedPosts: publishedPosts || 0,
    draftPosts,
    totalViews,
    categoryCount: categoryCount || 0,
    hashtagCount: hashtagCount || 0,
    recentPosts: recentPosts || [],
    popularPosts: popularPosts || [],
    categoriesWithCount,
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">ダッシュボード</h1>
        <p className="text-text-secondary mt-1">サイトの統計と最新情報</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">総記事数</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.totalPosts}
              </p>
              <p className="text-xs text-text-secondary mt-1">
                公開 {stats.publishedPosts} / 下書き {stats.draftPosts}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent-turquoise/10">
              <Eye className="h-6 w-6 text-accent-turquoise" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">総閲覧数</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.totalViews.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-accent-purple/10">
              <FolderOpen className="h-6 w-6 text-accent-purple" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">カテゴリ数</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.categoryCount}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-category-food-start/10">
              <Hash className="h-6 w-6 text-category-food-start" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">ハッシュタグ数</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.hashtagCount}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Posts */}
        <Card className="p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">
              最近の記事
            </h2>
          </div>
          <div className="space-y-3">
            {stats.recentPosts.length === 0 ? (
              <p className="text-text-secondary text-sm">記事がありません</p>
            ) : (
              stats.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/admin/posts/${post.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-background transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {post.title}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString('ja-JP')
                        : '未設定'}
                    </p>
                  </div>
                  <span
                    className={`ml-3 px-2 py-1 rounded-full text-xs ${
                      post.is_published
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {post.is_published ? '公開' : '下書き'}
                  </span>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/admin/posts"
            className="block mt-4 text-sm text-primary hover:underline"
          >
            すべての記事を見る →
          </Link>
        </Card>

        {/* Popular Posts */}
        <Card className="p-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">
              人気の記事
            </h2>
          </div>
          <div className="space-y-3">
            {stats.popularPosts.length === 0 ? (
              <p className="text-text-secondary text-sm">記事がありません</p>
            ) : (
              stats.popularPosts.map((post, index) => (
                <Link
                  key={post.id}
                  href={`/admin/posts/${post.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-background transition-colors"
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {post.title}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-text-secondary">
                    <Eye className="h-3 w-3" />
                    {post.view_count?.toLocaleString() || 0}
                  </span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Categories with post count */}
      <Card className="p-6 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <FolderOpen className="h-5 w-5 text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">
            カテゴリ別記事数
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {stats.categoriesWithCount.map((category) => (
            <Link
              key={category.id}
              href={`/admin/categories/${category.id}`}
              className="p-4 rounded-lg border border-border-decorative hover:border-primary transition-colors"
            >
              <p className="font-medium text-text-primary">{category.name}</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {category.postCount}
              </p>
              <p className="text-xs text-text-secondary">記事</p>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
