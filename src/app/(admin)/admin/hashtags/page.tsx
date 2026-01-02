import Link from 'next/link'
import { getHashtags } from './actions'
import { HashtagList } from './_components/HashtagList'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'

export default async function HashtagsPage() {
  const hashtags = await getHashtags()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ハッシュタグ一覧</h1>
          <p className="text-text-secondary mt-1">
            全 {hashtags.length} タグ
          </p>
        </div>
        <Link href="/admin/hashtags/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            新規作成
          </Button>
        </Link>
      </div>

      <HashtagList hashtags={hashtags} />
    </div>
  )
}
