import { getCategories, getHashtags } from '../actions'
import { PostForm } from '../_components/PostForm'

export default async function NewPostPage() {
  const [categories, hashtags] = await Promise.all([
    getCategories(),
    getHashtags(),
  ])

  return (
    <PostForm
      mode="create"
      categories={categories}
      hashtags={hashtags}
    />
  )
}
