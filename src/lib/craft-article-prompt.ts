/**
 * Prompt builders for 記事クラフト（チラシ/メモ→記事）。
 *
 * 2 パス構成:
 * 1) 抽出パス buildCraftExtractPrompt — チラシ画像/PDF・メモを「忠実に読み取って整理」する。
 *    出力は {category_slug, keywords, organized_facts}（お手本選定 + 執筆の材料）。
 * 2) 執筆パス buildCraftArticlePrompt — 文体プロファイル + お手本記事 + 整理済みの事実で、
 *    FUNE の語り口の通常記事（h2セクション構造）を書く。出力は IgArticleAiOutput 互換 JSON。
 *
 * 事実は必ず素材の範囲内。捏造は禁止（不足箇所は加筆プレースホルダ）。
 */

import { parseJsonLoose, ArticleAiValidationError } from '@/lib/article-ai-shared'
import type { StyleExample } from '@/lib/craft-example-selector'

const PERSONA = `あなたは南信州（飯田市・下伊那地域）の地域情報を発信するライター「FUNE」（本岡紗代）です。`

const CATEGORY_LINE = (categories: Array<{ slug: string; name: string }>) =>
  categories.map((c) => `- ${c.slug} (${c.name})`).join('\n')

// ------------------------------------------------------------
// 1) 抽出パス
// ------------------------------------------------------------

export interface CraftExtraction {
  category_slug: string
  keywords: string[]
  organized_facts: string
}

export function buildCraftExtractPrompt(input: {
  categories: Array<{ slug: string; name: string }>
  memoText: string
  hasImages: boolean
}): string {
  const memoBlock = input.memoText.trim()
    ? `\n【メモ（入力テキスト）】\n${input.memoText.trim()}`
    : ''
  const imageNote = input.hasImages
    ? '添付されたチラシ画像 / PDF を読み取ってください。'
    : '添付画像はありません。メモのみが素材です。'

  return `${PERSONA}

これから、地域の情報（チラシ画像 / PDF、または入力メモ）をもとに記事を書きます。
このステップでは **まだ記事を書かず**、素材を忠実に読み取って整理してください。

【厳守】
- 素材に書かれている情報だけを抽出する。推測で事実を足さない（捏造禁止）。
- 文字が読み取れない箇所は無理に埋めない。
- 日付・時間・料金・住所・電話・URL・主催者名・店名などの実務情報は正確に写し取る。

【やること】
1. 素材の内容を、記事の材料として過不足なく整理する（organized_facts）。
   - 種別（店 / イベント / スポット / 人物 / 催し 等）、名称、日時、場所・住所、料金、特徴、連絡先、URL などを箇条書き中心で。
2. 最も合う既存カテゴリを 1 つ選ぶ（category_slug）。
3. 似た題材の過去記事を探すためのキーワードを 3〜8 個（keywords）。地名・ジャンル・固有名詞など具体的に。

【既存カテゴリ】
${CATEGORY_LINE(input.categories)}

【出力は JSON のみ】（説明文・マークダウンフェンスは一切出力しない）
{
  "category_slug": "gourmet",
  "keywords": ["飯田市", "ラーメン", "..."],
  "organized_facts": "・種別: ...\\n・名称: ...\\n・日時: ...\\n・場所: ...\\n・料金: ...\\n・特徴: ...\\n・連絡先: ..."
}

【素材】
${imageNote}${memoBlock}
`
}

export function parseCraftExtraction(raw: string): CraftExtraction {
  const parsed = parseJsonLoose(raw)
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('抽出結果がオブジェクトではありません')
  }
  const o = parsed as Record<string, unknown>

  const categorySlug =
    typeof o.category_slug === 'string' ? o.category_slug.trim() : ''
  const keywords = Array.isArray(o.keywords)
    ? o.keywords
        .map((k) => (typeof k === 'string' ? k.trim() : ''))
        .filter((k) => k.length > 0)
    : []
  const organizedFacts =
    typeof o.organized_facts === 'string' ? o.organized_facts.trim() : ''

  if (!organizedFacts) {
    throw new ArticleAiValidationError(
      '素材から記事の材料を読み取れませんでした。チラシの文字がはっきり写った画像か、メモを入力してください。'
    )
  }

  return { category_slug: categorySlug, keywords, organized_facts: organizedFacts }
}

// ------------------------------------------------------------
// 2) 執筆パス
// ------------------------------------------------------------

const EVENT_RULES = `【イベント情報の抽出ルール】
素材に開催日 + 会場 が含まれていればイベントとして扱い、is_event=true、関連フィールドを埋める。
含まれていない（普通の紹介）なら is_event=false で関連フィールドはすべて null。
- event_date_start / event_date_end: ISO 形式 YYYY-MM-DD（単日は start のみ・end は null／複数日は両方／相対表記や定期開催は null + extraction_note にメモ）
- event_time_start / event_time_end: 自由記述（"10:00", "10時〜"）
- event_venue: 会場名 / event_address: 住所（あれば）
- event_fee: 料金（"無料", "500円" 等）
- event_url: 公式サイトや申込フォームの URL（素材にあれば）
- extraction_note: 抽出に関する補足（曖昧な日付などの人間レビュー用メモ）`

export function buildCraftArticlePrompt(input: {
  styleProfile: string
  examples: StyleExample[]
  extraction: CraftExtraction
  memoText: string
  categories: Array<{ slug: string; name: string }>
}): string {
  const examplesBlock =
    input.examples.length === 0
      ? '（題材の近いお手本記事が見つかりませんでした。文体プロファイルに厳密に従ってください。）'
      : input.examples
          .map(
            (e, i) =>
              `--- お手本 ${i + 1}: ${e.title} ---\n${e.text}`
          )
          .join('\n\n')

  const memoBlock = input.memoText.trim()
    ? `\n【補足メモ（書き手からの指示・追加情報）】\n${input.memoText.trim()}`
    : ''

  return `あなたはライター「FUNE」（本岡紗代）として、地域の記事を書きます。
以下の【文体プロファイル】を厳密に守り、紗代さん本人の文章のクセ・語り口・リズムを再現してください。

=== 文体プロファイル（正本） ===
${input.styleProfile}
=== 文体プロファイルここまで ===

【お手本記事】
紗代さん本人の過去記事です。文体・段落のリズム・語尾・温度感 **だけ** を参考にしてください。
※ここに書かれている具体的な事実（店名・地名・料金・営業時間・駐車場の条件・日付・人物・エピソード等）は
  **今回の記事とは無関係** です。お手本から事実を持ち込まないこと。今回の記事に書ける事実は、
  下の「今回の記事の素材」に書かれているものだけです。

${examplesBlock}

【今回の記事の素材（整理済みの事実）】
${input.extraction.organized_facts}${memoBlock}

【書き方のルール】
- 文体プロファイルに沿って、FUNE の語り口で 1 本の通常記事を書く。
- 構成は「h2 見出し（■ 付き）→ 文章」のセクション構造にする。1 セクション = 1 話題。
  見出しは内容を要約しつつ引き・評価を込めた言葉にする（無味乾燥な「概要」「詳細」は避ける）。
- **画像・写真は後から人が編集画面で挿入する。<img> や figure は絶対に入れない**。
  見出しで気持ちよく区切っておけば、あとから写真を差し込みやすくなる。
- **素材にある事実だけで書く**。食べていない・訪れていない・聞いていないことを、
  さも体験したように書かない（体験談・感想・会話・数値の捏造は厳禁）。
- 料金・営業時間・駐車場の無料条件・アクセスの所要時間などの **具体的な数値・条件は、
  素材に明記されていなければ書かない**（一般論や「たぶんこうだろう」で補わない）。
  例: 素材に「近くに市営駐車場」とだけあれば「近隣に市営駐車場があります」程度にとどめ、
  「2時間まで無料」などの条件は勝手に足さない。
- 情報が薄いセクションは無理に膨らませず、その位置に
  「<p>※ここに実際の取材・体験の内容を加筆してください</p>」を挿入する。
- 文体プロファイル通りに、書き出しのあいさつ・導入フック・まとめ（余韻で締める）・
  末尾の基本情報ブロック・結びの定型あいさつを付ける。
  基本情報は素材にある項目だけを載せる（無い項目は書かない・でっち上げない）。
- クレジットや「元 Instagram」等の出典表記は入れない。
- content_html は Tiptap 互換タグ（h2, h3, p, ul, ol, li, strong, em, a）のみ。**img は使わない**。
- 出力は JSON のみ。説明文・マークダウンフェンスは一切出力しない。

${EVENT_RULES}

【出力 JSON スキーマ】
{
  "title": "記事タイトル（15〜45字。イベントなら【日付】や【地名】等の修飾を含めて良い）",
  "excerpt": "記事抜粋（60〜120字）",
  "content_html": "<p>...</p><h2>■...</h2><p>...</p>...（h2/h3/p/ul/ol/li/strong/em/a のみ。img は使わない）",
  "recommended_category_slug": "既存カテゴリから 1 つ（素材のカテゴリ推定は '${input.extraction.category_slug}'）",
  "recommended_hashtags": ["タグ1", "タグ2"],
  "event": {
    "is_event": false,
    "event_date_start": null,
    "event_date_end": null,
    "event_time_start": null,
    "event_time_end": null,
    "event_venue": null,
    "event_address": null,
    "event_fee": null,
    "event_url": null,
    "extraction_note": null
  }
}
※ recommended_hashtags は 3〜8 個、# なし、日本語可。
※ is_event=false の場合は event 以下の各フィールドはすべて null にする。

【既存カテゴリ一覧】
${CATEGORY_LINE(input.categories)}
`
}
