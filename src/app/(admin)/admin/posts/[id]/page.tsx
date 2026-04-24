import { notFound } from 'next/navigation'
import {
  getCategories,
  getHashtags,
  getImportedOrigin,
  getPost,
} from '../actions'
import { getIgPosts } from '../../instagram/posts/actions'
import { PostForm } from '../_components/PostForm'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditPostPage({ params }: PageProps) {
  const { id } = await params

  const [post, categories, hashtags, igPosts, importedOrigin] = await Promise.all([
    getPost(id),
    getCategories(),
    getHashtags(),
    getIgPosts({ post_id: id, limit: 3 }),
    getImportedOrigin(id),
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
      igSection={{
        initialIgPosts: igPosts.items,
        totalIgPosts: igPosts.totalCount,
        importedOrigin,
      }}
    />
  )
}
