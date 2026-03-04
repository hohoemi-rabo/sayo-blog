import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  generateKnowledge,
  generateEmbedding,
  buildEmbeddingText,
  sleep,
} from '@/lib/knowledge-generator'
import { KnowledgeMetadata } from '@/lib/types'

const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000

// Regenerate embeddings only for existing knowledge records
async function handleEmbeddingOnly(supabase: SupabaseClient) {
  const { data: records, error } = await supabase
    .from('article_knowledge')
    .select('id, metadata, content')

  if (error || !records || records.length === 0) {
    return Response.json(
      { error: 'ナレッジデータが見つかりません' },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      let successCount = 0
      let failedCount = 0
      const errors: Array<{ post_id: string; title: string; error: string }> = []

      for (let i = 0; i < records.length; i++) {
        const record = records[i]
        const metadata = record.metadata as KnowledgeMetadata
        const title = metadata?.title || '不明'

        send('progress', {
          current: i + 1,
          total: records.length,
          title,
          status: 'embedding',
        })

        try {
          const embeddingText = buildEmbeddingText(
            metadata?.title || '',
            metadata?.summary || '',
            record.content || ''
          )
          const embedding = await generateEmbedding(embeddingText)

          const { error: updateError } = await supabase
            .from('article_knowledge')
            .update({ embedding: JSON.stringify(embedding) })
            .eq('id', record.id)

          if (updateError) {
            throw new Error(updateError.message)
          }

          successCount++
        } catch (err) {
          failedCount++
          errors.push({
            post_id: record.id,
            title,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }

        // Rate limit delay
        if (i < records.length - 1) {
          await sleep(500)
        }
      }

      send('complete', { success: successCount, failed: failedCount, errors })
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

export async function POST(request: Request) {
  // Auth check
  const cookieStore = await cookies()
  const authToken = cookieStore.get('admin_auth')
  if (authToken?.value !== 'authenticated') {
    return new Response(JSON.stringify({ error: '認証が必要です' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const body = await request.json().catch(() => ({}))
  const postIds: string[] | undefined = body.post_ids
  const regenerateEmbedding: boolean = body.regenerate_embedding ?? true
  const embeddingOnly: boolean = body.embedding_only ?? false

  const supabase = createAdminClient()

  // "embedding_only" mode: regenerate embeddings for existing knowledge without AI content generation
  if (embeddingOnly) {
    return handleEmbeddingOnly(supabase)
  }

  // Get target posts
  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      content,
      excerpt,
      published_at,
      post_categories(categories(slug)),
      post_hashtags(hashtags(name))
    `
    )
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  if (postIds && postIds.length > 0) {
    query = query.in('id', postIds)
  }

  const { data: posts, error: postsError } = await query

  if (postsError || !posts) {
    return new Response(
      JSON.stringify({ error: '記事の取得に失敗しました' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const total = posts.length

  // SSE stream
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        )
      }

      let successCount = 0
      let failedCount = 0
      const errors: Array<{ post_id: string; title: string; error: string }> =
        []

      for (let i = 0; i < posts.length; i++) {
        const post = posts[i]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const postAny = post as Record<string, any>
        const categorySlug =
          postAny.post_categories?.[0]?.categories?.slug || ''
        const hashtags =
          postAny.post_hashtags
            ?.map(
              (ph: { hashtags: { name: string } | null }) =>
                ph.hashtags?.name
            )
            .filter(Boolean) || []

        send('progress', {
          current: i + 1,
          total,
          title: post.title,
          status: 'generating',
        })

        let retries = 0
        let success = false

        while (retries < MAX_RETRIES && !success) {
          try {
            // Generate knowledge
            const { metadata, content } = await generateKnowledge({
              title: post.title,
              content: post.content,
              excerpt: post.excerpt ?? undefined,
              category: categorySlug,
              hashtags,
              published_at: post.published_at || '',
            })

            // Generate embedding
            let embedding: number[] | null = null
            if (regenerateEmbedding) {
              try {
                const embeddingText = buildEmbeddingText(
                  metadata.title,
                  metadata.summary,
                  content
                )
                embedding = await generateEmbedding(embeddingText)
              } catch (embError) {
                console.error(
                  `Embedding generation failed for ${post.title}:`,
                  embError
                )
                // Continue without embedding
              }
            }

            // UPSERT into article_knowledge
            const upsertData: Record<string, unknown> = {
              post_id: post.id,
              slug: post.slug,
              metadata,
              content,
              is_active: true,
            }
            if (embedding) {
              upsertData.embedding = JSON.stringify(embedding)
            }

            const { error: upsertError } = await supabase
              .from('article_knowledge')
              .upsert(upsertData, { onConflict: 'post_id' })

            if (upsertError) {
              throw new Error(upsertError.message)
            }

            successCount++
            success = true
          } catch (err) {
            retries++
            if (retries >= MAX_RETRIES) {
              const errorMsg =
                err instanceof Error ? err.message : 'Unknown error'
              failedCount++
              errors.push({
                post_id: post.id,
                title: post.title,
                error: errorMsg,
              })
              console.error(
                `Failed after ${MAX_RETRIES} retries for ${post.title}:`,
                errorMsg
              )
            } else {
              // Exponential backoff
              await sleep(BASE_DELAY_MS * Math.pow(2, retries))
            }
          }
        }

        // Rate limit delay between articles
        if (i < posts.length - 1) {
          await sleep(1500)
        }
      }

      send('complete', {
        success: successCount,
        failed: failedCount,
        errors,
      })

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
