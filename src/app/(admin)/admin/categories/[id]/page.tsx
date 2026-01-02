import { notFound } from 'next/navigation'
import { getCategory } from '../actions'
import { CategoryForm } from '../_components/CategoryForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params
  const category = await getCategory(id)

  if (!category) {
    notFound()
  }

  return <CategoryForm mode="edit" initialData={category} />
}
