'use server'

import { headers } from 'next/headers'
import { checkBotId } from 'botid/server'
import { createAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendInquiryNotification } from '@/lib/mailer'
import {
  miniInquirySchema,
  INQUIRY_IMAGE_MAX_COUNT,
} from '@/lib/inquiry-schema'
import { uploadInquiryImages, InquiryImageError } from '@/lib/inquiry-images'
import { MINI_INQUIRY_TYPE_LABELS } from '@/lib/inquiries'

export type SubmitMiniInquiryResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> }

function firstFieldErrors(
  flattened: Record<string, string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(flattened)) {
    if (msgs && msgs.length > 0) out[key] = msgs[0]
  }
  return out
}

export async function submitMiniInquiry(
  formData: FormData
): Promise<SubmitMiniInquiryResult> {
  // 1. BotID 検証 (ローカルは常に isBot:false)
  try {
    const verification = await checkBotId()
    if (verification.isBot) {
      return { ok: false, error: '送信を確認できませんでした。時間をおいて再度お試しください。' }
    }
  } catch (err) {
    // BotID 自体の障害でフォームを止めない (ログのみ)
    console.warn('[submitMiniInquiry] BotID check failed:', err)
  }

  // 2. レート制限 (IP 単位)
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown'
  if (!checkRateLimit(`mini-inquiry:${ip}`)) {
    return {
      ok: false,
      error: '送信が続いています。しばらく時間をおいてからお試しください。',
    }
  }

  // 3. ハニーポット (bot が埋めがちな隠しフィールド)。埋まっていたら静かに成功扱い。
  const honeypot = formData.get('company')
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return { ok: true }
  }

  // 4. Zod 検証 (ファイル以外)
  const rawUrls = formData
    .getAll('sns_urls')
    .map((v) => String(v).trim())
    .filter((v) => v !== '')
  const raw = {
    sns_urls: rawUrls,
    inquiry_type: formData.get('inquiry_type'),
    inquiry_type_other: (formData.get('inquiry_type_other') as string) || null,
    phone: formData.get('phone'),
    email: (formData.get('email') as string) || null,
    publish_preference: formData.get('publish_preference'),
    publish_target_date: (formData.get('publish_target_date') as string) || null,
    publish_target_month: (formData.get('publish_target_month') as string) || null,
    consent: formData.get('consent') === 'on' || formData.get('consent') === 'true',
  }

  const parsed = miniInquirySchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors = firstFieldErrors(
      parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
    )
    return {
      ok: false,
      error: '入力内容をご確認ください。',
      fieldErrors,
    }
  }
  const data = parsed.data

  // 5. 画像検証 + アップロード (service role)。id を先行発行して mini/{id}/ に保存。
  const files = formData
    .getAll('images')
    .filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > INQUIRY_IMAGE_MAX_COUNT) {
    return {
      ok: false,
      error: `画像は最大 ${INQUIRY_IMAGE_MAX_COUNT} 枚までです。`,
      fieldErrors: { images: `画像は最大 ${INQUIRY_IMAGE_MAX_COUNT} 枚までです` },
    }
  }

  const inquiryId = crypto.randomUUID()
  let imageUrls: string[] = []
  try {
    imageUrls = await uploadInquiryImages({ inquiryId, files })
  } catch (err) {
    if (err instanceof InquiryImageError) {
      return { ok: false, error: err.message, fieldErrors: { images: err.message } }
    }
    console.error('[submitMiniInquiry] image upload failed:', err)
    return { ok: false, error: '画像のアップロードに失敗しました。時間をおいて再度お試しください。' }
  }

  // 6. mini_inquiries に INSERT
  const supabase = createAdminClient()
  const { error: insertError } = await supabase.from('mini_inquiries').insert({
    id: inquiryId,
    sns_urls: data.sns_urls,
    inquiry_type: data.inquiry_type,
    inquiry_type_other:
      data.inquiry_type === 'other' ? data.inquiry_type_other : null,
    phone: data.phone,
    email: data.email || null,
    publish_preference: data.publish_preference,
    publish_target_date:
      data.publish_preference === 'by_date' ? data.publish_target_date : null,
    publish_target_month:
      data.publish_preference === 'in_month' ? data.publish_target_month : null,
    image_urls: imageUrls,
    consent: data.consent,
    status: 'pending',
  })

  if (insertError) {
    console.error('[submitMiniInquiry] insert failed:', insertError)
    return {
      ok: false,
      error: '送信に失敗しました。時間をおいて再度お試しください。',
    }
  }

  // 7. 紗代さんへ通知メール (失敗しても送信成功扱い)
  const summary = [
    `種別: ${MINI_INQUIRY_TYPE_LABELS[data.inquiry_type]}`,
    `URL: ${data.sns_urls.length} 件`,
    `画像: ${imageUrls.length} 枚`,
    `連絡先: ${data.phone}${data.email ? ` / ${data.email}` : ''}`,
  ].join('\n')
  await sendInquiryNotification({ type: 'mini', inquiryId, summary })

  return { ok: true }
}
