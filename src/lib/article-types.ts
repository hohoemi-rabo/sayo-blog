import type { ArticleType } from '@/lib/types'

/**
 * 記事の種類 (posts.article_type) の管理画面向け表示名。
 * 内部コード名は free / mini / long のまま、表示は公開名 (投稿記事 / 取材記事 / 自由記事) にそろえる。
 * Server / Client 両用。
 */
export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  free: '自由記事',
  mini: '投稿記事',
  long: '取材記事',
}

/** 記事編集画面の「記事の種類」欄で選択肢の下に出す説明 */
export const ARTICLE_TYPE_HINTS: Record<ArticleType, string> = {
  free: '依頼ではなく、自分で見つけて書く記事',
  mini: '読者から寄せられた情報 (フォーム・電話・DM など) をもとにした紹介記事',
  long: '依頼を受けて取材した記事',
}

/**
 * 記事の作成・編集画面で選べる種類 (並びは記事一覧のタブと同じ)。
 * 2026-10-31 に一度「自由記事は新しく作らない」にしたが、同日に「自由記事も必要」となり 3 択に戻した。
 */
export const ARTICLE_TYPE_CHOICES = ['mini', 'long', 'free'] as const satisfies readonly ArticleType[]
export const DEFAULT_ARTICLE_TYPE: ArticleType = 'mini'

export function isArticleType(value: unknown): value is ArticleType {
  return (ARTICLE_TYPE_CHOICES as readonly unknown[]).includes(value)
}

/** 記事一覧のタブ。「すべて」が既定で、並びは紗代さん指定 */
export type ArticleTypeTab = 'all' | ArticleType
export const ARTICLE_TYPE_TABS: ReadonlyArray<{ key: ArticleTypeTab; label: string }> = [
  { key: 'all', label: 'すべて' },
  { key: 'mini', label: ARTICLE_TYPE_LABELS.mini },
  { key: 'long', label: ARTICLE_TYPE_LABELS.long },
  { key: 'free', label: ARTICLE_TYPE_LABELS.free },
]

export function parseArticleTypeTab(value: string | undefined): ArticleTypeTab {
  return value === 'mini' || value === 'long' || value === 'free' ? value : 'all'
}
