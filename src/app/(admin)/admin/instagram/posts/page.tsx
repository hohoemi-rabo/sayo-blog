import {
  getAutoGenerateConfig,
  getIgPosts,
  getPublishedPostsForSelect,
} from './actions'
import { parseIgPostStatus } from './filters'
import { IgPostsClient } from './_components/IgPostsClient'
import { AutoGenerateSettings } from './_components/AutoGenerateSettings'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{
    status?: string
    post_id?: string
  }>
}

export default async function IgPostsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const status = parseIgPostStatus(params.status)
  const postId = params.post_id

  const [postsResult, publishedPosts, autoGenerate] = await Promise.all([
    getIgPosts({ status, post_id: postId, limit: 50 }),
    getPublishedPostsForSelect(),
    getAutoGenerateConfig(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Instagram 下書き管理
          </h1>
          <p className="text-text-secondary mt-1">
            {postsResult.totalCount} 件の下書き
          </p>
        </div>
      </div>

      <AutoGenerateSettings initialEnabled={autoGenerate.enabled} />

      <IgPostsClient
        initialItems={postsResult.items}
        totalCount={postsResult.totalCount}
        filter={{ status, post_id: postId }}
        publishedPosts={publishedPosts}
      />
    </div>
  )
}
