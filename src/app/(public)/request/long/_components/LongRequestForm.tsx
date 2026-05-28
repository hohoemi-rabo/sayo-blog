'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Label } from '@/components/ui/Label'
import { CLIENT_TYPE_LABELS } from '@/lib/inquiries'
import { CLIENT_TYPES } from '@/lib/inquiry-schema'
import type { ClientType } from '@/lib/types'
import { submitLongInquiry } from '../actions'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-sm text-red-600">{message}</p>
}

export function LongRequestForm() {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [clientType, setClientType] = useState<ClientType | ''>('')
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
        router.push('/request/long/thanks')
        return
      }
      setGeneralError(result.error)
      if (result.fieldErrors) setFieldErrors(result.fieldErrors)
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8" noValidate>
      {/* ハニーポット */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        defaultValue=""
      />

      {generalError && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
          {generalError}
        </div>
      )}

      {/* 種別 */}
      <fieldset className="space-y-3">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          種別 <span className="text-primary">*</span>
        </legend>
        <div className="grid grid-cols-3 gap-3">
          {CLIENT_TYPES.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                clientType === t
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border-decorative text-text-primary hover:bg-background-dark/5'
              }`}
            >
              <input
                type="radio"
                name="client_type"
                value={t}
                checked={clientType === t}
                onChange={() => setClientType(t)}
                className="sr-only"
              />
              {CLIENT_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        <FieldError message={fieldErrors.client_type} />

        {/* 種別ごとの条件項目 */}
        {clientType === 'individual' && (
          <div>
            <Label htmlFor="individual_name" className="mb-1.5 block">
              氏名 <span className="text-primary">*</span>
            </Label>
            <Input id="individual_name" name="individual_name" maxLength={100} />
            <FieldError message={fieldErrors.individual_name} />
          </div>
        )}
        {clientType === 'organization' && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="organization_name" className="mb-1.5 block">
                貴社名 <span className="text-primary">*</span>
              </Label>
              <Input
                id="organization_name"
                name="organization_name"
                maxLength={200}
              />
              <FieldError message={fieldErrors.organization_name} />
            </div>
            <div>
              <Label htmlFor="department_name" className="mb-1.5 block">
                部署名
                <span className="ml-2 text-xs font-normal text-text-secondary">（任意）</span>
              </Label>
              <Input
                id="department_name"
                name="department_name"
                maxLength={100}
              />
              <FieldError message={fieldErrors.department_name} />
            </div>
          </div>
        )}
        {clientType === 'group' && (
          <div>
            <Label htmlFor="group_name" className="mb-1.5 block">
              団体名 <span className="text-primary">*</span>
            </Label>
            <Input id="group_name" name="group_name" maxLength={200} />
            <FieldError message={fieldErrors.group_name} />
          </div>
        )}
      </fieldset>

      {/* 担当者 / 住所 */}
      <fieldset className="space-y-4">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          ご連絡担当
        </legend>
        <div>
          <Label htmlFor="contact_person" className="mb-1.5 block">
            担当者名 <span className="text-primary">*</span>
          </Label>
          <Input id="contact_person" name="contact_person" maxLength={100} />
          <FieldError message={fieldErrors.contact_person} />
        </div>
        <div>
          <Label htmlFor="address" className="mb-1.5 block">
            住所 <span className="text-primary">*</span>
          </Label>
          <Input
            id="address"
            name="address"
            maxLength={300}
            placeholder="長野県飯田市..."
          />
          <FieldError message={fieldErrors.address} />
        </div>
        <div>
          <Label htmlFor="phone" className="mb-1.5 block">
            電話番号 <span className="text-primary">*</span>
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="0265-22-2222"
            autoComplete="tel"
          />
          <FieldError message={fieldErrors.phone} />
        </div>
        <div>
          <Label htmlFor="email" className="mb-1.5 block">
            メールアドレス
            <span className="ml-2 text-xs font-normal text-text-secondary">（任意）</span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="sample@example.com"
            autoComplete="email"
          />
          <FieldError message={fieldErrors.email} />
        </div>
      </fieldset>

      {/* 取材内容 */}
      <fieldset className="space-y-3">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          取材内容 <span className="text-primary">*</span>
          <span className="ml-2 text-xs font-normal text-text-secondary">
            （200〜2000 字 / どんな取材をご希望か、できるだけ詳しくお書きください）
          </span>
        </legend>
        <Textarea
          id="interview_content"
          name="interview_content"
          rows={8}
          minLength={200}
          maxLength={2000}
          placeholder="どんな活動か、何を伝えたいか、想定する読者層、参考にしてほしい資料など"
        />
        <FieldError message={fieldErrors.interview_content} />
      </fieldset>

      {/* 公開希望 / 取材希望 */}
      <fieldset className="space-y-4">
        <legend className="font-noto-sans-jp text-base font-semibold text-text-primary">
          ご希望
        </legend>
        <div>
          <Label htmlFor="interview_preference" className="mb-1.5 block">
            取材希望時期
            <span className="ml-2 text-xs font-normal text-text-secondary">（任意）</span>
          </Label>
          <Input
            id="interview_preference"
            name="interview_preference"
            maxLength={100}
            placeholder="例: 来月の平日午後、◯月◯日以降など"
          />
          <FieldError message={fieldErrors.interview_preference} />
        </div>
        <div>
          <Label htmlFor="publish_preference" className="mb-1.5 block">
            公開希望時期
            <span className="ml-2 text-xs font-normal text-text-secondary">（任意）</span>
          </Label>
          <Input
            id="publish_preference"
            name="publish_preference"
            maxLength={100}
            placeholder="例: 来月中旬、◯月◯日のイベント前など"
          />
          <FieldError message={fieldErrors.publish_preference} />
        </div>
      </fieldset>

      {/* 同意 */}
      <fieldset className="space-y-2">
        <label className="flex items-start gap-3">
          <span className="mt-0.5">
            <Checkbox
              name="consent"
              checked={consent}
              onCheckedChange={setConsent}
            />
          </span>
          <span className="font-noto-serif-jp text-sm text-text-primary">
            提供した情報を取材・記事化することに同意します。
            取材日程や料金（500 円〜）は、ご連絡後に個別に相談させていただきます。
            <span className="text-primary">*</span>
          </span>
        </label>
        <FieldError message={fieldErrors.consent} />
      </fieldset>

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          {isPending ? '送信中…' : 'この内容で取材を依頼する'}
        </Button>
        <p className="mt-3 text-xs text-text-secondary">
          送信後 3 日以内に、紗代から個別にご連絡します。取材日程・料金は内容に応じてご相談させてください。
        </p>
      </div>
    </form>
  )
}
