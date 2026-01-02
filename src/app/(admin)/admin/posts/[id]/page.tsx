import { notFound } from 'next/navigation'
import { getPost, getCategories, getHashtags } from '../actions'
import { PostForm } from '../_components/PostForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params

  const [post, categories, hashtags] = await Promise.all([
    getPost(id),
    getCategories(),
    getHashtags(),
  ])

  if (!post) {
    notFound()
  }

  return (
    <PostForm
      mode="edit"
      categories={categories}
      hashtags={hashtags}
      initialData={post}
    />
  )
}
