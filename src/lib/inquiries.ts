/**
 * 情報窓口フォーム (Phase 4) の共通ラベル / 表示ヘルパー。
 * Server / Client 両方から import される同期モジュール (副作用なし)。
 */
import type {
  MiniInquiry,
  MiniInquiryStatus,
  MiniInquiryType,
  PublishPreference,
  LongInquiry,
  LongInquiryStatus,
  LongInquiryPlan,
  ClientType,
} from '@/lib/types'

export const MINI_INQUIRY_TYPE_LABELS: Record<MiniInquiryType, string> = {
  event: 'イベント',
  shop: 'お店紹介',
  group: '団体',
  other: 'その他',
}

export const MINI_INQUIRY_STATUS_LABELS: Record<MiniInquiryStatus, string> = {
  pending: '未対応',
  generating: '記事化中',
  published: '公開済み',
  skipped: 'スキップ',
}

export const PUBLISH_PREFERENCE_LABELS: Record<PublishPreference, string> = {
  anytime: 'お任せ',
  by_date: '期日まで',
  in_month: '月指定',
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  individual: '個人',
  organization: '組織',
  group: '団体',
}

/** 取材記事の希望プラン。LP (/request/interview) のプラン表と対応させること。 */
export const LONG_PLAN_LABELS: Record<LongInquiryPlan, string> = {
  monitor: '初期モニター記事（500円）',
  standard: '取材記事（10,000円）',
  deep: '深掘り記事（30,000円）',
  undecided: 'まだ決めていない / 相談したい',
}

/** フォームの選択肢用 (LP のプラン表と同じ並び) */
export const LONG_PLAN_OPTIONS: Array<{
  value: LongInquiryPlan
  label: string
  price: string
  hint: string
}> = [
  {
    value: 'monitor',
    label: '初期モニター記事',
    price: '¥500',
    hint: '電話・オンラインで聞き取り / 素材は先方提供',
  },
  {
    value: 'standard',
    label: '取材記事',
    price: '¥10,000',
    hint: '現地取材 + 写真撮影込み / 3,000文字まで',
  },
  {
    value: 'deep',
    label: '深掘り記事',
    price: '¥30,000',
    hint: '現地取材 + 写真撮影込み / 文字数制限なし',
  },
  {
    value: 'undecided',
    label: 'まだ決めていない',
    price: '相談',
    hint: '内容を伺ってから、一緒に決めます',
  },
]

export const LONG_INQUIRY_STATUS_LABELS: Record<LongInquiryStatus, string> = {
  pending: '受付',
  contacted: '連絡済',
  scheduled: '取材日確定',
  interviewed: '取材実施',
  writing: '執筆中',
  published: '公開済み',
  cancelled: 'キャンセル',
}

/** ミニ記事の公開希望を表示用文字列に整形する */
export function formatMiniPublishPreference(
  inquiry: Pick<
    MiniInquiry,
    'publish_preference' | 'publish_target_date' | 'publish_target_month'
  >
): string {
  switch (inquiry.publish_preference) {
    case 'by_date':
      return inquiry.publish_target_date
        ? `〜${inquiry.publish_target_date}`
        : '期日まで'
    case 'in_month':
      return inquiry.publish_target_month ?? '月指定'
    default:
      return 'お任せ'
  }
}

/** ロング記事依頼者の表示名を種別に応じて組み立てる */
export function formatClientName(inquiry: LongInquiry): string {
  switch (inquiry.client_type) {
    case 'individual':
      return inquiry.individual_name ?? '(無名)'
    case 'organization':
      return (
        [inquiry.organization_name, inquiry.department_name]
          .filter(Boolean)
          .join(' / ') || '(無名)'
      )
    case 'group':
      return inquiry.group_name ?? '(無名)'
  }
}

/** ISO 日時を「3 時間前」「2 日前」などの相対表記にする (1 週間超は日付) */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'たった今'
  if (min < 60) return `${min} 分前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} 時間前`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day} 日前`
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
