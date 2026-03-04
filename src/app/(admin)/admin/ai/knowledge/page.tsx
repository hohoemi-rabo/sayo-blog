import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getKnowledgeList } from './actions'
import { KnowledgeList } from './_components/KnowledgeList'
import { BulkGenerateDialog } from './_components/BulkGenerateDialog'
import { BulkEmbeddingDialog } from './_components/BulkEmbeddingDialog'

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
          <BulkEmbeddingDialog />
          <BulkGenerateDialog
            totalPosts={totalPosts}
            totalKnowledge={totalKnowledge}
          />
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
