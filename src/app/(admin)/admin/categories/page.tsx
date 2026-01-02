import Link from 'next/link'
import { getCategories } from './actions'
import { CategoryList } from './_components/CategoryList'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export default async function CategoriesPage() {
  const categories = await getCategories()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">カテゴリ一覧</h1>
          <p className="text-text-secondary mt-1">
            全 {categories.length} カテゴリ
          </p>
        </div>
        <Link href="/admin/categories/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <CategoryList categories={categories} />
    </div>
  )
}
