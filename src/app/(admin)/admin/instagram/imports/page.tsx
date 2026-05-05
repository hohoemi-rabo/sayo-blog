import { getApprovedActiveSources } from '@/app/(admin)/admin/instagram/sources/actions'
import { getIgImportedPosts } from './actions'
import { parseFilters } from './filters'
import { ImportsClient } from './_components/ImportsClient'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function ImportsPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const filter = parseFilters(sp)

  const [{ items, total }, sources] = await Promise.all([
    getIgImportedPosts(filter),
    getApprovedActiveSources(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            取り込み投稿一覧
          </h1>
          <p className="mt-1 text-text-secondary">
            {total} 件の取り込み投稿
          </p>
        </div>
      </div>

      <ImportsClient
        initialItems={items}
        totalCount={total}
        filter={filter}
        sources={sources}
      />
    </div>
  )
}
