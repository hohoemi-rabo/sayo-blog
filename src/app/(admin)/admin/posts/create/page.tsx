import Link from 'next/link'
import { ArrowLeft, FileImage, NotebookPen, PenLine, Sparkles } from 'lucide-react'

export const metadata = {
  title: '新規作成 | 記事',
}

interface CreateOption {
  href: string
  icon: typeof PenLine
  title: string
  description: string
  accent: string
  badge?: string
}

const OPTIONS: CreateOption[] = [
  {
    href: '/admin/posts/craft?mode=flyer',
    icon: FileImage,
    title: 'チラシから作成',
    description:
      'イベントやお店のチラシ写真・PDF を読み取り、紗代さんの文体で記事のたたき台を作ります。',
    accent: 'from-rose-400 to-orange-300',
    badge: 'AI',
  },
  {
    href: '/admin/posts/craft?mode=memo',
    icon: NotebookPen,
    title: 'メモから作成',
    description:
      '取材メモや箇条書きを貼り付けると、紗代さんの文体で記事のたたき台に整えます。',
    accent: 'from-sky-400 to-indigo-300',
    badge: 'AI',
  },
  {
    href: '/admin/posts/new',
    icon: PenLine,
    title: '自分で書く',
    description: '白紙のエディタを開いて、最初から自分で書きます。',
    accent: 'from-emerald-400 to-teal-300',
  },
]

export default function CreatePostPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <Link
          href="/admin/posts"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          記事一覧へ戻る
        </Link>
        <h1 className="text-2xl font-bold text-text-primary">
          どうやって記事を作りますか？
        </h1>
        <p className="mt-1 text-text-secondary">
          作り方を選んでください。AI で作ったたたき台も、あとから自由に編集できます。
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon
          return (
            <Link
              key={opt.href}
              href={opt.href}
              className="group relative flex flex-col rounded-2xl border border-border-decorative bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-primary hover:shadow-md"
            >
              {opt.badge && (
                <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Sparkles className="h-3 w-3" />
                  {opt.badge}
                </span>
              )}
              <div
                className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${opt.accent} text-white shadow-sm`}
              >
                <Icon className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-lg font-semibold text-text-primary">
                {opt.title}
              </h2>
              <p className="text-sm leading-relaxed text-text-secondary">
                {opt.description}
              </p>
            </Link>
          )
        })}
      </div>

      <p className="text-xs text-text-secondary">
        ※ AI が作った記事は「下書き」として保存されます。内容を確認・編集してから公開してください。
        写真は編集画面で差し込めます。
      </p>
    </div>
  )
}
