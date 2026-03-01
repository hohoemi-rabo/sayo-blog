import Link from 'next/link'
import { getTags } from './actions'
import { TagList } from './_components/TagList'
import { TagGenerateDialog } from './_components/TagGenerateDialog'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export default async function AiTagsPage() {
  const tags = await getTags()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">AI プロンプトタグ</h1>
          <p className="text-text-secondary mt-1">
            全 {tags.length} タグ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TagGenerateDialog />
          <Link href="/admin/ai/tags/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
          </Link>
        </div>
      </div>

      <TagList tags={tags} />
    </div>
  )
}
