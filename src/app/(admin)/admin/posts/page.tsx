import Link from 'next/link'
import { getPosts, getCategories } from './actions'
import { PostList } from './_components/PostList'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{
    page?: string
    category?: string
    status?: string
  }>
}

export default async function PostsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10)
  const filter = {
    category: params.category,
    status: params.status,
  }

  const [{ posts, count }, categories] = await Promise.all([
    getPosts(page, 20, filter),
    getCategories(),
  ])

  const totalPages = Math.ceil(count / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">記事一覧</h1>
          <p className="text-text-secondary mt-1">
            全 {count} 件の記事
          </p>
        </div>
        <Link href="/admin/posts/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <PostList
        posts={posts}
        categories={categories}
        currentPage={page}
        totalPages={totalPages}
        filter={filter}
      />
    </div>
  )
}
