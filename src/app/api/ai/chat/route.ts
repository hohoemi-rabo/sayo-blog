import { createAdminClient } from '@/lib/supabase'
import { getGenerativeModel } from '@/lib/gemini'
import { generateEmbedding } from '@/lib/knowledge-generator'
import { FUNE_SYSTEM_PROMPT, buildContextPrompt } from '@/lib/ai-prompt'
import type { MatchedArticle } from '@/lib/ai-prompt'
import {
  validateChatRequest,
  extractArticleSlugs,
  extractSpotNames,
  fetchArticleCards,
  matchSpots,
  fetchSuggestions,
} from '@/lib/ai-chat'
import type { ChatEventType } from '@/lib/types'

export const maxDuration = 30

export async function POST(request: Request) {
  // 1. Parse request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  // 2. Validate
  const validation = validateChatRequest(body)
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const { message, session_id, history } = validation.data
  const supabase = createAdminClient()

  // 3. Check usage limit
  let usageCheck: { allowed: boolean; daily_remaining: number; reason: string | null }
  try {
    const { data, error } = await supabase.rpc('check_usage_limit', {
      p_session_id: session_id,
    })
    if (error) throw error
    usageCheck = data as typeof usageCheck
  } catch (err) {
    console.error('Usage limit check failed:', err)
    return Response.json(
      { error: '利用制限の確認に失敗しました' },
      { status: 500 }
    )
  }

  if (!usageCheck.allowed) {
    const limitMessage =
      usageCheck.reason === 'daily_limit_reached'
        ? '今日はたくさんお話しましたね！また明日お気軽に聞いてください。ブログページからも記事を探せますよ。'
        : 'ただいまメンテナンス中です。ブログページから記事をお探しください。'

    return createSSEResponse(async (send) => {
      send('meta', { daily_remaining: 0 })
      send('error', limitMessage)
      send('done', '')
    })
  }

  // 4-11. Main processing in SSE stream
  return createSSEResponse(async (send) => {
    // Send remaining count to client
    send('meta', { daily_remaining: usageCheck.daily_remaining })

    let matchedArticles: MatchedArticle[] = []
    let fullText = ''
    let tokenInput: number | undefined
    let tokenOutput: number | undefined

    try {
      // 4. Generate embedding from user question
      const embedding = await generateEmbedding(message)

      // 5. Vector search for relevant knowledge
      const { data: searchResults, error: searchError } = await supabase.rpc(
        'match_articles',
        {
          query_embedding: JSON.stringify(embedding),
          match_threshold: 0.5,
          match_count: 5,
        }
      )

      if (searchError) {
        console.error('Vector search failed:', searchError)
        // Continue without knowledge — Gemini will respond accordingly
      } else {
        matchedArticles = (searchResults || []).map(
          (r: {
            id: string
            post_id: string
            slug: string
            metadata: MatchedArticle['metadata']
            content: string
            similarity: number
          }) => ({
            id: r.id,
            post_id: r.post_id,
            slug: r.slug,
            metadata: r.metadata,
            content: r.content,
            similarity: r.similarity,
          })
        )
      }

      // 6. Build system prompt with knowledge context
      const contextPrompt = buildContextPrompt(matchedArticles)
      const fullSystemPrompt = FUNE_SYSTEM_PROMPT + '\n' + contextPrompt

      // 7. Stream Gemini response
      const model = getGenerativeModel()
      const streamResult = await model.generateContentStream({
        systemInstruction: {
          role: 'user',
          parts: [{ text: fullSystemPrompt }],
        },
        contents: [
          ...history.map((h) => ({
            role: (h.role === 'assistant' ? 'model' : 'user') as
              | 'model'
              | 'user',
            parts: [{ text: h.content }],
          })),
          { role: 'user' as const, parts: [{ text: message }] },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      })

      // 8. Stream text chunks
      for await (const chunk of streamResult.stream) {
        const text = chunk.text()
        if (text) {
          fullText += text
          send('text', text)
        }
      }

      // Get token usage from aggregated response
      try {
        const aggregatedResponse = await streamResult.response
        const usage = aggregatedResponse.usageMetadata
        tokenInput = usage?.promptTokenCount
        tokenOutput = usage?.candidatesTokenCount
      } catch {
        // Token counting is non-critical
      }

      // 9. Post-processing after streaming complete
      // 9a. Extract and send article cards
      const slugs = extractArticleSlugs(fullText)
      if (slugs.length > 0) {
        const articles = await fetchArticleCards(supabase, slugs)
        if (articles.length > 0) {
          send('articles', articles)
        }
      }

      // 9b. Extract and send spot info
      const spotNames = extractSpotNames(fullText)
      if (spotNames.length > 0) {
        const spots = matchSpots(spotNames, matchedArticles)
        if (spots.length > 0) {
          send('spots', spots)
        }
      }

      // 9c. Send tag suggestions
      const suggestions = await fetchSuggestions(supabase)
      if (suggestions.length > 0) {
        send('suggestions', suggestions)
      }

      // 10. Done
      send('done', '')
    } catch (err) {
      console.error('Chat API error:', err)
      const errorMessage =
        'ごめんなさい、ちょっとうまくいかなかったみたいです。もう一度お試しいただけますか？'
      send('error', errorMessage)
      send('done', '')
    }

    // 11. Log usage (async, don't block)
    try {
      const matchedSlugs = matchedArticles.map((a) => a.slug)
      await supabase.rpc('log_ai_usage', {
        p_session_id: session_id,
        p_query: message,
        p_token_input: tokenInput ?? null,
        p_token_output: tokenOutput ?? null,
        p_matched_articles:
          matchedSlugs.length > 0 ? JSON.stringify(matchedSlugs) : null,
      })
    } catch (logErr) {
      console.error('Failed to log usage:', logErr)
    }
  })
}

// -------------------------------------------------------------------
// SSE Response helper
// -------------------------------------------------------------------

function createSSEResponse(
  handler: (send: (type: ChatEventType, content: unknown) => void) => Promise<void>
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: ChatEventType, content: unknown) => {
        const event = JSON.stringify({ type, content })
        controller.enqueue(encoder.encode(`data: ${event}\n\n`))
      }

      try {
        await handler(send)
      } catch (err) {
        console.error('SSE stream error:', err)
        const errorEvent = JSON.stringify({
          type: 'error',
          content: 'ストリームでエラーが発生しました',
        })
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`))
        const doneEvent = JSON.stringify({ type: 'done', content: '' })
        controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`))
      } finally {
        controller.close()
      }
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
