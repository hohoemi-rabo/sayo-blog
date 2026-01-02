import { notFound } from 'next/navigation'
import { getHashtag } from '../actions'
import { HashtagForm } from '../_components/HashtagForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditHashtagPage({ params }: PageProps) {
  const { id } = await params
  const hashtag = await getHashtag(id)

  if (!hashtag) {
    notFound()
  }

  return <HashtagForm mode="edit" initialData={hashtag} />
}
