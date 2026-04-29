import { getCategoriesForSelect, getIgSources } from './actions'
import { parseIgActiveFilter, parseIgPermissionStatus } from './filters'
import { SourcesClient } from './_components/SourcesClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    permission_status?: string
    is_active?: string
    category_slug?: string
    q?: string
  }>
}

export default async function IgSourcesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filter = {
    permission_status: parseIgPermissionStatus(params.permission_status),
    is_active: parseIgActiveFilter(params.is_active),
    category_slug:
      typeof params.category_slug === 'string' ? params.category_slug : '',
    q: typeof params.q === 'string' ? params.q : '',
  }

  const [{ items, totalCount }, categories] = await Promise.all([
    getIgSources(filter),
    getCategoriesForSelect(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            IG 取得先アカウント管理
          </h1>
          <p className="text-text-secondary mt-1">
            {totalCount} 件のアカウント
          </p>
        </div>
      </div>

      <SourcesClient
        initialItems={items}
        totalCount={totalCount}
        filter={filter}
        categories={categories}
      />
    </div>
  )
}
