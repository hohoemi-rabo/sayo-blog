import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CraftForm } from './_components/CraftForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ mode?: string }>
}

function parseMode(value: string | undefined): 'flyer' | 'memo' {
  return value === 'memo' ? 'memo' : 'flyer'
}

const COPY = {
  flyer: {
    title: 'チラシから記事を作る',
    description:
      'イベントやお店のチラシ写真・PDF をアップロードすると、AI が内容を読み取り、紗代さんの文体で記事のたたき台を作ります。補足したいことがあればメモにも書けます。',
  },
  memo: {
    title: 'メモから記事を作る',
    description:
      '取材メモや箇条書きを貼り付けると、AI が紗代さんの文体で記事のたたき台に整えます。チラシ写真があれば一緒に読み取れます。',
  },
} as const

export default async function CraftPage({ searchParams }: PageProps) {
  const mode = parseMode((await searchParams).mode)
  const copy = COPY[mode]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/posts/create"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          作り方の選択へ戻る
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">{copy.title}</h1>
        <p className="mt-1 text-sm leading-relaxed text-text-secondary">
          {copy.description}
        </p>
      </div>

      <CraftForm mode={mode} />

      <p className="text-xs text-text-secondary">
        ※ AI は素材に書かれている情報だけをもとに書きます。事実が足りない箇所には
        「※ここに実際の取材・体験の内容を加筆してください」という目印が入るので、編集画面で仕上げてください。
      </p>
    </div>
  )
}
