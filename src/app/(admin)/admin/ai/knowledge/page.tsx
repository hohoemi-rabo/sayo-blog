import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getKnowledgeList } from './actions'
import { KnowledgeList } from './_components/KnowledgeList'

interface PageProps {
  searchParams: Promise<{
    status?: string
    needsUpdate?: string
  }>
}

export default async function KnowledgePage({ searchParams }: PageProps) {
  const params = await searchParams
  const filter = {
    status: params.status,
    needsUpdate: params.needsUpdate === 'true',
  }

  const { items, totalPosts, totalKnowledge } = await getKnowledgeList(filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI Knowledge</h1>
          <p className="text-text-secondary mt-1">
            {totalPosts}記事中 {totalKnowledge}件のナレッジ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" disabled className="gap-2" title="Ticket 23 で実装予定">
            <Sparkles className="h-4 w-4" />
            一括生成
          </Button>
          <Link href="/admin/ai/knowledge/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      {/* List */}
      <KnowledgeList items={items} filter={filter} />
    </div>
  )
}
