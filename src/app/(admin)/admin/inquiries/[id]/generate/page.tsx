import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getMiniInquiry } from '../../actions'
import {
  MINI_INQUIRY_TYPE_LABELS,
  formatMiniPublishPreference,
  isPdfAttachment,
} from '@/lib/inquiries'
import { InquiryAttachments } from '@/components/admin/InquiryAttachments'
import { GenerateForm } from './_components/GenerateForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GenerateMiniArticlePage({ params }: PageProps) {
  const { id } = await params
  const inquiry = await getMiniInquiry(id)
  if (!inquiry) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/admin/inquiries?tab=mini"
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        依頼一覧に戻る
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text-primary">ミニ記事の AI 生成</h1>
        <p className="mt-1 text-text-secondary">
          各 URL の投稿本文を貼り付けて、たたき台を生成します
        </p>
      </div>

      {/* 提供された情報 (読み取り専用) */}
      <section className="rounded-xl border border-border-decorative bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          提供された情報
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-text-secondary">種別</dt>
            <dd className="text-text-primary">
              {MINI_INQUIRY_TYPE_LABELS[inquiry.inquiry_type]}
              {inquiry.inquiry_type === 'other' && inquiry.inquiry_type_other
                ? `（${inquiry.inquiry_type_other}）`
                : null}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-text-secondary">連絡先</dt>
            <dd className="text-text-primary">
              {inquiry.phone}
              {inquiry.email ? ` / ${inquiry.email}` : ''}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-text-secondary">公開希望</dt>
            <dd className="text-text-primary">
              {formatMiniPublishPreference(inquiry)}
            </dd>
          </div>
          {inquiry.image_urls.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-text-secondary">チラシ・写真</dt>
              <dd>
                <InquiryAttachments urls={inquiry.image_urls} />
                {inquiry.image_urls.some(isPdfAttachment) && (
                  <p className="mt-1.5 text-xs text-text-secondary">
                    ※ PDF は記事本文には差し込まれません。中身を読んで、下の本文欄に内容を書き起こしてください。
                  </p>
                )}
              </dd>
            </div>
          )}
        </dl>
        {inquiry.sns_urls.length > 0 && (
          <div className="mt-3 border-t border-border-decorative/50 pt-3">
            <p className="mb-1 text-xs text-text-secondary">SNS URL</p>
            <ul className="space-y-1 text-sm">
              {inquiry.sns_urls.map((url, i) => (
                <li key={i}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 break-all text-primary hover:underline"
                  >
                    {i + 1}. {url}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <GenerateForm
        inquiryId={inquiry.id}
        snsUrls={inquiry.sns_urls}
      />
    </div>
  )
}
