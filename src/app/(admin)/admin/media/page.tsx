import { listMediaFiles } from './actions'
import { MediaList } from './_components/MediaList'
import { ImageIcon } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MediaPage() {
  const { files, error } = await listMediaFiles()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">メディア管理</h1>
          <p className="text-text-secondary mt-1">
            アップロードされた画像を管理します
          </p>
        </div>
        <div className="flex items-center gap-2 text-text-secondary">
          <ImageIcon className="h-5 w-5" />
          <span>{files.length} 件</span>
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-600">
          {error}
        </div>
      ) : (
        <MediaList initialFiles={files} />
      )}
    </div>
  )
}
