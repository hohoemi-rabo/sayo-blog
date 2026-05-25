import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

/**
 * Gmail SMTP (Nodemailer) で紗代さんへ依頼通知を送る。
 *
 * 設計方針:
 * - メール送信の失敗・設定欠如で **フォーム送信フロー自体を失敗させない**。
 *   送信エラーはログに記録するだけで、Inquiry の DB 保存は成功扱いにする。
 *   (ユーザーは完了画面まで進めるべきで、メール失敗で再送を強いるのは UX が悪い)
 * - 紗代さんは管理画面の未読バッジでも依頼に気づけるため、通知はベストエフォート。
 */

const GMAIL_SMTP_USER = process.env.GMAIL_SMTP_USER
const GMAIL_SMTP_APP_PASSWORD = process.env.GMAIL_SMTP_APP_PASSWORD
const INQUIRY_NOTIFY_TO = process.env.INQUIRY_NOTIFY_TO

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!GMAIL_SMTP_USER || !GMAIL_SMTP_APP_PASSWORD) {
    return null
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_SMTP_USER,
        pass: GMAIL_SMTP_APP_PASSWORD,
      },
    })
  }
  return transporter
}

export interface InquiryNotificationInput {
  type: 'mini' | 'long'
  inquiryId: string
  /** メール本文に載せる概要 (種別・連絡先・URL 数など) */
  summary: string
}

/**
 * 依頼通知メールを送信する。失敗しても throw しない (ログのみ)。
 */
export async function sendInquiryNotification(
  input: InquiryNotificationInput
): Promise<void> {
  const tx = getTransporter()
  if (!tx) {
    console.warn(
      '[mailer] GMAIL_SMTP_USER / GMAIL_SMTP_APP_PASSWORD 未設定のため通知メールをスキップしました。'
    )
    return
  }
  if (!INQUIRY_NOTIFY_TO) {
    console.warn('[mailer] INQUIRY_NOTIFY_TO 未設定のため通知メールをスキップしました。')
    return
  }

  const typeLabel = input.type === 'mini' ? 'ミニ記事' : 'ロング記事'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const adminUrl = `${siteUrl}/admin/inquiries?tab=${input.type}&open=${input.inquiryId}`

  try {
    await tx.sendMail({
      from: GMAIL_SMTP_USER,
      to: INQUIRY_NOTIFY_TO,
      subject: `[Sayo's Journal] 新しい${typeLabel}依頼が届きました`,
      text: `新しい${typeLabel}の依頼が届きました。\n\n${input.summary}\n\n管理画面で確認:\n${adminUrl}\n`,
    })
  } catch (err) {
    console.error('[mailer] 通知メールの送信に失敗しました:', err)
  }
}
