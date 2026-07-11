'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CLIENT_TYPE_LABELS, LONG_PLAN_OPTIONS } from '@/lib/inquiries'
import { CLIENT_TYPES } from '@/lib/inquiry-schema'
import type { ClientType, LongInquiryPlan } from '@/lib/types'
import { submitLongInquiry } from '../actions'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="lp-error">{message}</p>
}

const INTERVIEW_MIN = 200
const INTERVIEW_MAX = 2000

/**
 * 取材記事 LP (/request/interview) 埋め込みフォーム。
 * LP のクラス (.lp-*) で組むが、backend は既存 submitLongInquiry を再利用する。
 * 種別 (個人/組織/団体) で必須項目を出し分ける点は従来フォームと同じ。
 */
export function LongLpForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const [plan, setPlan] = useState<LongInquiryPlan | ''>('')
  const [clientType, setClientType] = useState<ClientType | ''>('')
  const [interviewLen, setInterviewLen] = useState(0)
  const [consent, setConsent] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGeneralError(null)
    setFieldErrors({})

    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await submitLongInquiry(fd)
      if (result.ok) {
        router.push('/request/interview/thanks')
        return
      }
      setGeneralError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="lp-form lp-form-card"
      noValidate
    >
      {/* ハニーポット (人には見えない / bot 対策) */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="honeypot"
        defaultValue=""
      />

      {generalError && <div className="lp-alert">{generalError}</div>}

      {/* 希望プラン */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          希望プラン<span className="req">*</span>
        </legend>
        <p className="lp-hint">
          迷っている場合は「まだ決めていない」で大丈夫です。内容を伺ってから一緒に決めます。
        </p>
        <div className="lp-plangrid">
          {LONG_PLAN_OPTIONS.map((p) => (
            <label
              key={p.value}
              className={`lp-plan-choice ${plan === p.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="desired_plan"
                value={p.value}
                checked={plan === p.value}
                onChange={() => setPlan(p.value)}
              />
              <span className="lp-plan-top">
                <span className="lp-plan-name">{p.label}</span>
                <span className="lp-plan-price">{p.price}</span>
              </span>
              <span className="lp-plan-hint">{p.hint}</span>
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.desired_plan} />
      </fieldset>

      {/* 依頼者の種別 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          ご依頼者<span className="req">*</span>
        </legend>
        <div className="lp-choicegrid cols-3">
          {CLIENT_TYPES.map((t) => (
            <label
              key={t}
              className={`lp-choice ${clientType === t ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="client_type"
                value={t}
                checked={clientType === t}
                onChange={() => setClientType(t)}
              />
              {CLIENT_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.client_type} />

        {clientType === 'individual' && (
          <div>
            <label htmlFor="lp-individual" className="lp-hint">
              お名前 <span className="req">*</span>
            </label>
            <input
              id="lp-individual"
              name="individual_name"
              type="text"
              className="lp-input"
              maxLength={100}
              placeholder="山田 花子"
              autoComplete="name"
            />
            <FieldError message={fieldErrors.individual_name} />
          </div>
        )}

        {clientType === 'organization' && (
          <>
            <div>
              <label htmlFor="lp-org" className="lp-hint">
                貴社名 <span className="req">*</span>
              </label>
              <input
                id="lp-org"
                name="organization_name"
                type="text"
                className="lp-input"
                maxLength={200}
                placeholder="株式会社◯◯"
                autoComplete="organization"
              />
              <FieldError message={fieldErrors.organization_name} />
            </div>
            <div>
              <label htmlFor="lp-dept" className="lp-hint">
                部署名（任意）
              </label>
              <input
                id="lp-dept"
                name="department_name"
                type="text"
                className="lp-input"
                maxLength={100}
                placeholder="広報部"
              />
              <FieldError message={fieldErrors.department_name} />
            </div>
          </>
        )}

        {clientType === 'group' && (
          <div>
            <label htmlFor="lp-group" className="lp-hint">
              団体名 <span className="req">*</span>
            </label>
            <input
              id="lp-group"
              name="group_name"
              type="text"
              className="lp-input"
              maxLength={200}
              placeholder="◯◯実行委員会"
            />
            <FieldError message={fieldErrors.group_name} />
          </div>
        )}
      </fieldset>

      {/* 担当者 / 住所 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">ご連絡先</legend>
        <div>
          <label htmlFor="lp-person" className="lp-hint">
            ご担当者名 <span className="req">*</span>
          </label>
          <input
            id="lp-person"
            name="contact_person"
            type="text"
            className="lp-input"
            maxLength={100}
            placeholder="山田 花子"
          />
          <FieldError message={fieldErrors.contact_person} />
        </div>
        <div>
          <label htmlFor="lp-address" className="lp-hint">
            住所（取材先） <span className="req">*</span>
          </label>
          <input
            id="lp-address"
            name="address"
            type="text"
            className="lp-input"
            maxLength={300}
            placeholder="長野県飯田市◯◯ 1-2-3"
            autoComplete="street-address"
          />
          <FieldError message={fieldErrors.address} />
        </div>
        <div>
          <label htmlFor="lp-phone" className="lp-hint">
            電話番号 <span className="req">*</span>
          </label>
          <input
            id="lp-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            className="lp-input"
            placeholder="0265-00-0000"
            autoComplete="tel"
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <div>
          <label htmlFor="lp-email" className="lp-hint">
            メールアドレス（任意）
          </label>
          <input
            id="lp-email"
            name="email"
            type="email"
            inputMode="email"
            className="lp-input"
            placeholder="sample@example.com"
            autoComplete="email"
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </fieldset>

      {/* 取材内容 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          取材してほしい内容<span className="req">*</span>
        </legend>
        <p className="lp-hint">
          紹介したいこと、伝えたい想い、参考になる素材（写真・チラシ・SNS・HP など）があれば、分かる範囲でお書きください。
        </p>
        <textarea
          name="interview_content"
          className="lp-textarea"
          maxLength={INTERVIEW_MAX}
          onChange={(e) => setInterviewLen(e.target.value.trim().length)}
          placeholder={`例）◯◯という小さなパン屋を営んでいます。開業までの経緯や、地元の小麦にこだわる理由を伝えたいです。店内の写真は用意できます。（${INTERVIEW_MIN}字以上・${INTERVIEW_MAX}字まで）`}
        />
        <p className="lp-counter">
          {interviewLen} / {INTERVIEW_MAX} 字
          {interviewLen > 0 && interviewLen < INTERVIEW_MIN
            ? `（あと ${INTERVIEW_MIN - interviewLen} 字）`
            : ''}
        </p>
        <FieldError message={fieldErrors.interview_content} />
      </fieldset>

      {/* 希望時期 */}
      <fieldset className="lp-fieldset">
        <legend className="lp-legend">
          ご希望
          <span className="opt">（任意 / 決まっていなくて大丈夫です）</span>
        </legend>
        <div>
          <label htmlFor="lp-interview-pref" className="lp-hint">
            取材のご希望（日程・方法など）
          </label>
          <input
            id="lp-interview-pref"
            name="interview_preference"
            type="text"
            className="lp-input"
            maxLength={100}
            placeholder="例）平日午前が希望 / オンライン希望"
          />
          <FieldError message={fieldErrors.interview_preference} />
        </div>
        <div>
          <label htmlFor="lp-publish-pref" className="lp-hint">
            公開時期のご希望
          </label>
          <input
            id="lp-publish-pref"
            name="publish_preference"
            type="text"
            className="lp-input"
            maxLength={100}
            placeholder="例）11月のイベント前までに"
          />
          <FieldError message={fieldErrors.publish_preference} />
        </div>
      </fieldset>

      {/* 同意 */}
      <fieldset className="lp-fieldset">
        <label className="lp-consent">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            取材のうえ Sayo&apos;s Journal で記事化することに同意します。
            <span className="req">*</span>
          </span>
        </label>
        <FieldError message={fieldErrors.consent} />
      </fieldset>

      <div>
        <button type="submit" className="lp-submit" disabled={isPending}>
          {isPending ? '送信中…' : 'この内容で相談する'}
        </button>
        <p className="lp-submit-note">
          送信後 3 日以内に、ご記入の連絡先へお返事します。送信の時点で費用は発生しません。
        </p>
      </div>
    </form>
  )
}
