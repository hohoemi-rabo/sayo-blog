import Link from 'next/link'
import { getPosts, getCategories, getPostTypeCounts } from './actions'
import { PostList } from './_components/PostList'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import { parseArticleTypeTab } from '@/lib/article-types'

interface PageProps {
  searchParams: Promise<{
    category?: string
    status?: string
    type?: string
  }>
}

export default async function PostsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const articleType = parseArticleTypeTab(params.type)
  const filter = {
    category: params.category,
    status: params.status,
    articleType,
  }

  const [{ posts, count }, categories, typeCounts] = await Promise.all([
    getPosts(filter),
    getCategories(),
    getPostTypeCounts(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">記事一覧</h1>
          <p className="text-text-secondary mt-1">
            {count} 件の記事
          </p>
        </div>
        <Link href="/admin/posts/create">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <PostList
        posts={posts}
        categories={categories}
        filter={filter}
        articleType={articleType}
        typeCounts={typeCounts}
      />
    </div>
  )
}
