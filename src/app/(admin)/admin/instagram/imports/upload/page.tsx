import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getApprovedActiveSources } from '@/app/(admin)/admin/instagram/sources/actions'
import { UploadClient } from './_components/UploadClient'

export const dynamic = 'force-dynamic'

export default async function UploadPage() {
  const sources = await getApprovedActiveSources()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/instagram/imports"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          取得投稿一覧へ戻る
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-text-primary">
          📥 IG 投稿の取り込み
        </h1>
        <p className="mt-1 text-text-secondary">
          Cowork で取得した CSV と画像ファイルをアップロードして取り込みます。
        </p>
      </div>

      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-decorative bg-background-dark/5 p-6 text-sm text-text-secondary">
          取り込み対象のアカウントがありません。
          <br />
          <Link
            href="/admin/instagram/sources"
            className="text-primary hover:underline"
          >
            取得先アカウント管理
          </Link>
          で許可状態を「許可済み」に、取得設定を「有効」にしてください。
        </div>
      ) : (
        <UploadClient sources={sources} />
      )}
    </div>
  )
}
