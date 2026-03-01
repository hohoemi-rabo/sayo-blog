import { notFound } from 'next/navigation'
import { getKnowledge, getCategories } from '../actions'
import { KnowledgeForm } from '../_components/KnowledgeForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditKnowledgePage({ params }: PageProps) {
  const { id } = await params

  const [knowledge, categories] = await Promise.all([
    getKnowledge(id),
    getCategories(),
  ])

  if (!knowledge) {
    notFound()
  }

  return (
    <KnowledgeForm
      mode="edit"
      categories={categories}
      initialData={knowledge}
    />
  )
}
