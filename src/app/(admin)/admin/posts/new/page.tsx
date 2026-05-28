import { getCategories, getHashtags } from '../actions'
import { getLongInquiry } from '../../inquiries/actions'
import { PostForm } from '../_components/PostForm'
import { formatClientName } from '@/lib/inquiries'

interface PageProps {
  searchParams: Promise<{
    from_inquiry?: string
    id?: string
  }>
}

export default async function NewPostPage({ searchParams }: PageProps) {
  const { from_inquiry, id } = await searchParams

  const [categories, hashtags] = await Promise.all([
    getCategories(),
    getHashtags(),
  ])

  // 取材依頼から作成する導線
  let linkLongInquiryId: string | undefined
  let linkLongInquiryLabel: string | undefined
  if (from_inquiry === 'long' && id) {
    const inquiry = await getLongInquiry(id)
    if (inquiry) {
      linkLongInquiryId = inquiry.id
      linkLongInquiryLabel = `${formatClientName(inquiry)} / ${inquiry.contact_person}`
    }
  }

  return (
    <PostForm
      mode="create"
      categories={categories}
      hashtags={hashtags}
      linkLongInquiryId={linkLongInquiryId}
      linkLongInquiryLabel={linkLongInquiryLabel}
      forcedArticleType={linkLongInquiryId ? 'long' : undefined}
    />
  )
}
