import { getCategories, getHashtags, type InquiryLink } from '../actions'
import { getLongInquiry, getMiniInquiry } from '../../inquiries/actions'
import { PostForm } from '../_components/PostForm'
import { formatClientName, MINI_INQUIRY_TYPE_LABELS } from '@/lib/inquiries'
import type { LongInquiry, MiniInquiry } from '@/lib/types'

interface PageProps {
  searchParams: Promise<{
    from_inquiry?: string
    id?: string
  }>
}

/** 投稿記事の依頼の説明。依頼者名の欄は無いので、種別と元の URL / 添付で見分ける */
function miniInquiryLabel(inquiry: MiniInquiry): string {
  const type =
    inquiry.inquiry_type === 'other' && inquiry.inquiry_type_other
      ? inquiry.inquiry_type_other.slice(0, 20)
      : MINI_INQUIRY_TYPE_LABELS[inquiry.inquiry_type]
  const source = inquiry.sns_urls[0] ?? (inquiry.image_urls.length > 0 ? 'チラシ・写真の添付' : '')
  return source ? `${type} / ${source}` : type
}

function longInquiryLabel(inquiry: LongInquiry): string {
  return `${formatClientName(inquiry)} / ${inquiry.contact_person}`
}

/**
 * 依頼管理から来たときの紐付け先。
 * すでに記事が紐付いている依頼は対象外 (二重に作らない)。
 */
async function resolveInquiryLink(
  fromInquiry: string | undefined,
  id: string | undefined
): Promise<InquiryLink | undefined> {
  if (!id) return undefined
  if (fromInquiry === 'mini') {
    const inquiry = await getMiniInquiry(id)
    if (!inquiry || inquiry.generated_post_id) return undefined
    return { kind: 'mini', id: inquiry.id, label: miniInquiryLabel(inquiry) }
  }
  if (fromInquiry === 'long') {
    const inquiry = await getLongInquiry(id)
    if (!inquiry || inquiry.generated_post_id) return undefined
    return { kind: 'long', id: inquiry.id, label: longInquiryLabel(inquiry) }
  }
  return undefined
}

export default async function NewPostPage({ searchParams }: PageProps) {
  const { from_inquiry, id } = await searchParams

  const [categories, hashtags, inquiryLink] = await Promise.all([
    getCategories(),
    getHashtags(),
    resolveInquiryLink(from_inquiry, id),
  ])

  return (
    <PostForm
      mode="create"
      categories={categories}
      hashtags={hashtags}
      inquiryLink={inquiryLink}
    />
  )
}
