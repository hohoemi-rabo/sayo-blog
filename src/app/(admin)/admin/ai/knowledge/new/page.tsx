import { getPostsWithoutKnowledge, getCategories } from '../actions'
import { KnowledgeForm } from '../_components/KnowledgeForm'

interface PageProps {
  searchParams: Promise<{
    post_id?: string
  }>
}

export default async function NewKnowledgePage({ searchParams }: PageProps) {
  const params = await searchParams

  const [availablePosts, categories] = await Promise.all([
    getPostsWithoutKnowledge(),
    getCategories(),
  ])

  return (
    <KnowledgeForm
      mode="create"
      categories={categories}
      availablePosts={availablePosts}
      preselectedPostId={params.post_id}
    />
  )
}
