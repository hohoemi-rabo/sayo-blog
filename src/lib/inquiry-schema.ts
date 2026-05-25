import { z } from 'zod'
import type { MiniInquiryType, PublishPreference } from '@/lib/types'

/**
 * 情報窓口フォーム (ミニ記事) の入力バリデーション。
 * Server Action 側で FormData をプレーンオブジェクトに変換してから検証する。
 * 画像ファイルは zod では検証せず、Server Action 内で別途 mime/サイズを確認する。
 */

export const MINI_INQUIRY_TYPES = [
  'event',
  'shop',
  'group',
  'other',
] as const satisfies readonly MiniInquiryType[]

export const PUBLISH_PREFERENCES = [
  'anytime',
  'by_date',
  'in_month',
] as const satisfies readonly PublishPreference[]

/** 日本の電話番号 (ハイフン有無・全角半角ハイフン両対応) */
function isValidJapanesePhone(value: string): boolean {
  const digits = value.replace(/[-－―—\s]/g, '')
  return /^0\d{9,10}$/.test(digits)
}

/** YYYY-MM-DD 形式か */
function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

/** YYYY-MM 形式か */
function isIsoMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

export const miniInquirySchema = z
  .object({
    sns_urls: z
      .array(z.url({ error: 'URL の形式が正しくありません' }))
      .min(1, { error: 'SNS の URL を 1 つ以上入力してください' })
      .max(5, { error: 'URL は最大 5 つまでです' }),
    inquiry_type: z.enum(MINI_INQUIRY_TYPES, { error: '種別を選択してください' }),
    inquiry_type_other: z
      .string()
      .trim()
      .max(100, { error: '100 字以内で入力してください' })
      .nullable(),
    phone: z
      .string()
      .trim()
      .min(1, { error: '電話番号を入力してください' })
      .refine(isValidJapanesePhone, {
        error: '電話番号の形式が正しくありません（例: 0265-22-2222）',
      }),
    email: z
      .union([z.email({ error: 'メールアドレスの形式が正しくありません' }), z.literal('')])
      .nullable(),
    publish_preference: z.enum(PUBLISH_PREFERENCES, {
      error: '公開希望時期を選択してください',
    }),
    publish_target_date: z.string().nullable(),
    publish_target_month: z.string().nullable(),
    consent: z.literal(true, {
      error: '記事化への同意が必要です',
    }),
  })
  .superRefine((data, ctx) => {
    // 種別「その他」のとき補足必須
    if (data.inquiry_type === 'other' && !data.inquiry_type_other?.trim()) {
      ctx.addIssue({
        code: 'custom',
        path: ['inquiry_type_other'],
        message: '「その他」の内容を入力してください',
      })
    }
    // 公開希望「期日指定」のとき翌日以降の日付必須
    if (data.publish_preference === 'by_date') {
      const v = data.publish_target_date
      if (!v || !isIsoDate(v)) {
        ctx.addIssue({
          code: 'custom',
          path: ['publish_target_date'],
          message: '公開希望日を入力してください',
        })
      } else {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const target = new Date(`${v}T00:00:00`)
        if (target <= today) {
          ctx.addIssue({
            code: 'custom',
            path: ['publish_target_date'],
            message: '公開希望日は翌日以降を指定してください',
          })
        }
      }
    }
    // 公開希望「月指定」のとき当月以降の月必須
    if (data.publish_preference === 'in_month') {
      const v = data.publish_target_month
      if (!v || !isIsoMonth(v)) {
        ctx.addIssue({
          code: 'custom',
          path: ['publish_target_month'],
          message: '公開希望月を選択してください',
        })
      } else {
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        if (v < currentMonth) {
          ctx.addIssue({
            code: 'custom',
            path: ['publish_target_month'],
            message: '公開希望月は当月以降を指定してください',
          })
        }
      }
    }
  })

export type MiniInquiryInput = z.infer<typeof miniInquirySchema>

/** 添付画像の制約 */
export const INQUIRY_IMAGE_MAX_COUNT = 2
export const INQUIRY_IMAGE_MAX_BYTES = 10 * 1024 * 1024 // 10MB
export const INQUIRY_IMAGE_ACCEPT = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
] as const
