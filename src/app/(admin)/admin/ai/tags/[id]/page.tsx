import { notFound } from 'next/navigation'
import { getTag } from '../actions'
import { TagForm } from '../_components/TagForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditTagPage({ params }: PageProps) {
  const { id } = await params
  const tag = await getTag(id)

  if (!tag) {
    notFound()
  }

  return <TagForm mode="edit" initialData={tag} />
}
