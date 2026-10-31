import type { ArticleType } from '@/lib/types'

/**
 * 記事の種類 (posts.article_type) の管理画面向け表示名。
 * 内部コード名は free / mini / long のまま、表示は公開名 (投稿記事 / 取材記事) にそろえる。
 * Server / Client 両用。
 */
export const ARTICLE_TYPE_LABELS: Record<ArticleType, string> = {
  free: '自由記事',
  mini: '投稿記事',
  long: '取材記事',
}

/** 記事編集画面の「記事の種類」欄で選択肢の下に出す説明 */
export const ARTICLE_TYPE_HINTS: Record<ArticleType, string> = {
  free: 'これまでの記事 (新しくは作りません)',
  mini: '読者から寄せられた情報 (フォーム・電話・DM など) をもとにした紹介記事',
  long: '依頼を受けて取材した記事',
}

/**
 * 新しく作る記事で選べる種類。
 * 自由記事は 2026-10-31 に新規作成をやめた (紗代さんの方針。既存の記事は自由記事のまま残る)。
 */
export const NEW_ARTICLE_TYPES = ['mini', 'long'] as const satisfies readonly ArticleType[]
export type NewArticleType = (typeof NEW_ARTICLE_TYPES)[number]
export const DEFAULT_NEW_ARTICLE_TYPE: NewArticleType = 'mini'

export function isNewArticleType(value: unknown): value is NewArticleType {
  return (NEW_ARTICLE_TYPES as readonly unknown[]).includes(value)
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
