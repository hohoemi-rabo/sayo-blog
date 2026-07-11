'use server'

import { headers } from 'next/headers'
import { checkBotId } from 'botid/server'
import { createAdminClient } from '@/lib/supabase'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendInquiryNotification } from '@/lib/mailer'
import { longInquirySchema } from '@/lib/inquiry-schema'
import { CLIENT_TYPE_LABELS, LONG_PLAN_LABELS } from '@/lib/inquiries'

export type SubmitLongInquiryResult =
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

export async function submitLongInquiry(
  formData: FormData
): Promise<SubmitLongInquiryResult> {
  // 1. BotID
  try {
    const verification = await checkBotId()
    if (verification.isBot) {
      return { ok: false, error: '送信を確認できませんでした。時間をおいて再度お試しください。' }
    }
  } catch (err) {
    console.warn('[submitLongInquiry] BotID check failed:', err)
  }

  // 2. レート制限
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    hdrs.get('x-real-ip') ||
    'unknown'
  if (!checkRateLimit(`long-inquiry:${ip}`)) {
    return {
      ok: false,
      error: '送信が続いています。しばらく時間をおいてからお試しください。',
    }
  }

  // 3. ハニーポット
  const honeypot = formData.get('company')
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return { ok: true }
  }

  // 4. Zod
  const raw = {
    client_type: formData.get('client_type'),
    desired_plan: formData.get('desired_plan'),
    individual_name: (formData.get('individual_name') as string) || null,
    organization_name: (formData.get('organization_name') as string) || null,
    department_name: (formData.get('department_name') as string) || null,
    group_name: (formData.get('group_name') as string) || null,
    contact_person: formData.get('contact_person'),
    address: formData.get('address'),
    interview_content: formData.get('interview_content'),
    publish_preference: (formData.get('publish_preference') as string) || null,
    interview_preference: (formData.get('interview_preference') as string) || null,
    phone: formData.get('phone'),
    email: (formData.get('email') as string) || null,
    consent: formData.get('consent') === 'on' || formData.get('consent') === 'true',
  }
  const parsed = longInquirySchema.safeParse(raw)
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

  // 5. INSERT
  const supabase = createAdminClient()
  const { data: inserted, error: insertError } = await supabase
    .from('long_inquiries')
    .insert({
      client_type: data.client_type,
      desired_plan: data.desired_plan,
      individual_name:
        data.client_type === 'individual' ? data.individual_name : null,
      organization_name:
        data.client_type === 'organization' ? data.organization_name : null,
      department_name:
        data.client_type === 'organization' ? data.department_name : null,
      group_name: data.client_type === 'group' ? data.group_name : null,
      contact_person: data.contact_person,
      address: data.address,
      interview_content: data.interview_content,
      publish_preference: data.publish_preference || null,
      interview_preference: data.interview_preference || null,
      phone: data.phone,
      email: data.email || null,
      consent: data.consent,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error('[submitLongInquiry] insert failed:', insertError)
    return {
      ok: false,
      error: '送信に失敗しました。時間をおいて再度お試しください。',
    }
  }

  // 6. 紗代さんへ通知メール (失敗しても送信成功扱い)
  const clientName =
    data.client_type === 'individual'
      ? data.individual_name
      : data.client_type === 'organization'
        ? `${data.organization_name}${data.department_name ? ' / ' + data.department_name : ''}`
        : data.group_name
  const summary = [
    `種別: ${CLIENT_TYPE_LABELS[data.client_type]}`,
    `希望プラン: ${LONG_PLAN_LABELS[data.desired_plan]}`,
    `依頼者: ${clientName ?? ''}`,
    `担当者: ${data.contact_person}`,
    `連絡先: ${data.phone}${data.email ? ` / ${data.email}` : ''}`,
    `取材希望: ${data.interview_preference ?? '（未記入）'}`,
    `公開希望: ${data.publish_preference ?? '（未記入）'}`,
  ].join('\n')
  await sendInquiryNotification({
    type: 'long',
    inquiryId: inserted.id as string,
    summary,
  })

  return { ok: true }
}
