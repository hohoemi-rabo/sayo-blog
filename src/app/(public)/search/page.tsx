import { Suspense } from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Hashtag, PostWithRelations } from '@/lib/types'
import { hashtagPath } from '@/lib/seo-utils'
import {
  buildSnippet,
  htmlToPlainText,
  splitSearchTerms,
  type SnippetSegment,
} from '@/lib/search-text'
import PostGrid from '@/components/PostGrid'
import Pagination from '@/components/Pagination'
import SearchBar from '@/components/SearchBar'
import { Search, AlertCircle } from 'lucide-react'

interface SearchPageProps {
  searchParams: Promise<{
    q?: string
    page?: string
  }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams
  const query = params.q

  const title = query ? `「${query}」の検索結果` : '検索'

  return {
    title,
    robots: {
      index: false,
      follow: true,
    },
  }
}

const PAGE_SIZE = 12

interface SearchResult {
  posts: PostWithRelations[]
  count: number
  snippets: Map<string, SnippetSegment[] | null>
}

const EMPTY_RESULT: SearchResult = { posts: [], count: 0, snippets: new Map() }

/**
 * 検索語を含む公開記事を探す。判定と並び順は DB の search_published_posts
 * (タイトル > タグ > カテゴリ > 抜粋 > 本文、複数語は AND)。
 */
async function searchPosts(terms: string[], page: number): Promise<SearchResult> {
  if (terms.length === 0) return EMPTY_RESULT

  const supabase = createClient()
  const { data: hits, error } = await supabase.rpc('search_published_posts', {
    search_terms: terms,
    result_limit: PAGE_SIZE,
    result_offset: (page - 1) * PAGE_SIZE,
  })

  if (error) {
    console.error('Error searching posts:', error)
    return EMPTY_RESULT
  }

  const rows = (hits ?? []) as Array<{ id: string; total_count: number }>
  // 範囲外のページでは行が返らず総数も分からないので 0 件扱い (ページ送りからは来ない)
  const count = rows[0] ? Number(rows[0].total_count) : 0
  if (rows.length === 0) return { ...EMPTY_RESULT, count }

  const postIds = rows.map((r) => r.id)
  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select(
      `
      *,
      post_categories!inner(
        categories!inner(id, slug, name, parent_id)
      ),
      post_hashtags(
        hashtags(id, name, slug, count)
      )
    `
    )
    .in('id', postIds)
    .eq('is_published', true)

  if (postsError) {
    console.error('Error fetching post details:', postsError)
    return { ...EMPTY_RESULT, count }
  }

  const postsMap = new Map((posts ?? []).map((p) => [p.id, p as PostWithRelations]))
  const sortedPosts = postIds
    .map((id) => postsMap.get(id))
    .filter((p): p is PostWithRelations => Boolean(p))

  return { posts: sortedPosts, count, snippets: buildSnippets(sortedPosts, terms) }
}

/**
 * カードに出す「検索語が見つかった箇所」。
 * 抜粋に語があれば抜粋全体を強調付きで、無ければ本文の該当箇所の前後を出す。
 * どちらにも無い (タイトル・タグ・カテゴリだけで一致) ときは null = 通常の抜粋。
 */
function buildSnippets(posts: PostWithRelations[], terms: string[]) {
  const snippets = new Map<string, SnippetSegment[] | null>()
  for (const post of posts) {
    const fromExcerpt = post.excerpt
      ? buildSnippet(post.excerpt, terms, { before: post.excerpt.length, after: post.excerpt.length })
      : null
    snippets.set(
      post.id,
      fromExcerpt ?? buildSnippet(htmlToPlainText(post.content ?? ''), terms)
    )
  }
  return snippets
}

/** 0 件のときに出す人気のタグ */
async function getPopularHashtags(): Promise<Pick<Hashtag, 'id' | 'name' | 'slug' | 'count'>[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hashtags')
    .select('id, name, slug, count')
    .gt('count', 0)
    .order('count', { ascending: false })
    .limit(10)
  if (error) {
    console.error('Error fetching popular hashtags:', error)
    return []
  }
  return data ?? []
}

function searchPath(query: string) {
  return `/search?q=${encodeURIComponent(query)}`
}

// Suspense 内で検索を実行し、ヘッダー/検索バーより後からストリーミングする
async function SearchResults({ query, page }: { query: string; page: number }) {
  const terms = splitSearchTerms(query)
  const { posts, count, snippets } = await searchPosts(terms, page)
  const totalPages = Math.ceil(count / PAGE_SIZE)

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-noto-sans-jp text-text-primary">
          「<span className="font-semibold text-primary">{query}</span>」の検索結果
          <span className="ml-2 text-text-secondary">({count}件)</span>
        </h2>
        {terms.length > 1 && count > 0 && (
          <p className="mt-1 text-sm text-text-secondary font-noto-sans-jp">
            すべての言葉を含む記事を表示しています
          </p>
        )}
      </div>

      {posts.length > 0 ? (
        <>
          <PostGrid posts={posts} snippets={snippets} />

          {totalPages > 1 && (
            <div className="mt-12">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={count}
                itemsPerPage={PAGE_SIZE}
              />
            </div>
          )}
        </>
      ) : (
        <NoResults terms={terms} />
      )}
    </>
  )
}

async function NoResults({ terms }: { terms: string[] }) {
  const hashtags = await getPopularHashtags()

  return (
    <div className="text-center py-12 px-4">
      <AlertCircle className="w-16 h-16 text-text-secondary/40 mx-auto mb-4" />
      <h3 className="text-xl font-noto-serif-jp text-text-primary mb-2">
        検索結果が見つかりませんでした
      </h3>
      <p className="text-text-secondary mb-8 font-noto-sans-jp">
        言葉を短くしたり、別の言い方にしたりすると見つかることがあります
      </p>

      {terms.length > 1 && (
        <div className="mb-8">
          <p className="text-sm text-text-secondary mb-3 font-noto-sans-jp">
            言葉をひとつにして探す
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {terms.map((term) => (
              <Link
                key={term}
                href={searchPath(term)}
                className="inline-flex items-center px-4 py-2 rounded-full border border-border-decorative text-sm font-noto-sans-jp text-text-primary hover:border-primary hover:text-primary transition-colors"
              >
                「{term}」で探す
              </Link>
            ))}
          </div>
        </div>
      )}

      {hashtags.length > 0 && (
        <div>
          <p className="text-sm text-text-secondary mb-3 font-noto-sans-jp">
            よく読まれているタグから探す
          </p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
            {hashtags.map((hashtag) => (
              <Link
                key={hashtag.id}
                href={hashtagPath(hashtag.slug)}
                className="inline-flex items-center px-3 py-1.5 bg-background-dark/5 hover:bg-primary/10 text-text-secondary hover:text-primary rounded-full text-sm font-noto-sans-jp transition-colors"
              >
                #{hashtag.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const query = params.q || ''
  const pageParam = params.page || '1'
  const currentPage = Math.max(1, parseInt(pageParam, 10) || 1)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-playfair font-bold text-text-primary mb-6 flex items-center gap-3">
            <Search className="w-8 h-8" />
            検索
          </h1>

          {/* Search Bar */}
          <SearchBar />
        </div>

        {/* Search Results */}
        {query ? (
          <Suspense
            key={`search-${query}-page-${currentPage}`}
            fallback={<div className="text-center py-8">読み込み中...</div>}
          >
            <SearchResults query={query} page={currentPage} />
          </Suspense>
        ) : (
          <div className="text-center py-16 px-4">
            <Search className="w-16 h-16 text-text-secondary/40 mx-auto mb-4" />
            <h3 className="text-xl font-noto-serif-jp text-text-primary mb-2">
              キーワードを入力して検索
            </h3>
            <p className="text-text-secondary">
              記事のタイトル・本文・タグから検索できます。スペースで区切ると、すべての言葉を含む記事に絞れます
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
