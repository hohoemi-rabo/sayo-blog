import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase'
import { getGenerativeModel } from '@/lib/gemini'

export async function POST() {
  // Auth check
  const cookieStore = await cookies()
  const authToken = cookieStore.get('admin_auth')
  if (authToken?.value !== 'authenticated') {
    return Response.json({ error: '認証が必要です' }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Get all active knowledge data
  const { data: knowledge, error: kError } = await supabase
    .from('article_knowledge')
    .select('metadata, content')
    .eq('is_active', true)

  if (kError || !knowledge || knowledge.length === 0) {
    return Response.json(
      { error: 'ナレッジデータが見つかりません' },
      { status: 400 }
    )
  }

  // Build summary of knowledge for Gemini
  const summaries = knowledge.map((k) => {
    const meta = k.metadata as {
      title?: string
      category?: string
      area?: string
      summary?: string
      keywords?: string[]
    }
    return `- ${meta.title || '不明'} (${meta.category || ''}/${meta.area || ''}): ${meta.summary || ''} [${(meta.keywords || []).join(', ')}]`
  })

  const prompt = `以下はブログサイト「Sayo's Journal」のナレッジデータ一覧です。
このサイトは長野県飯田市・南信州エリアのグルメ、スポット、イベント、文化を紹介しています。

${summaries.join('\n')}

上記の情報を分析し、ユーザーが AI チャットで質問しそうなプロンプトタグを生成してください。

タグの種別:
- purpose: 「〜を探す」「〜を知りたい」など目的ベースのタグ（5〜8個）
- area: 「天龍峡」「丘の上」などエリアベースのタグ（3〜6個）
- scene: 「子連れで行ける」「デートにおすすめ」などシーンベースのタグ（3〜6個）

各タグには以下を含めてください:
- label: チャット画面に表示する短いテキスト（2〜8文字程度）
- prompt: AI に送信する自然な質問文（20〜50文字程度）
- tag_type: purpose / area / scene

JSON形式で出力してください:
{
  "tags": [
    { "label": "ランチを探す", "prompt": "飯田市でおすすめのランチスポットを教えて", "tag_type": "purpose" }
  ]
}

注意:
- 実際のナレッジデータに基づいた具体的なタグを生成すること
- 存在しない情報についてのタグは作らない
- ラベルは短く、直感的に分かるものにする
- プロンプトは自然な日本語の質問文にする
- JSON のみを出力し、他のテキストは含めない`

  try {
    const model = getGenerativeModel()
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json(
        { error: 'タグの生成結果を解析できませんでした' },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])
    const tags = parsed.tags

    if (!Array.isArray(tags) || tags.length === 0) {
      return Response.json(
        { error: 'タグが生成されませんでした' },
        { status: 500 }
      )
    }

    // Validate and sanitize
    const validTags = tags
      .filter(
        (t: { label?: string; prompt?: string; tag_type?: string }) =>
          t.label && t.prompt && t.tag_type && ['purpose', 'area', 'scene'].includes(t.tag_type)
      )
      .map((t: { label: string; prompt: string; tag_type: string }) => ({
        label: t.label,
        prompt: t.prompt,
        tag_type: t.tag_type,
      }))

    return Response.json({ tags: validTags })
  } catch (err) {
    console.error('Tag generation error:', err)
    return Response.json(
      { error: 'タグの生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
