import type { KnowledgeMetadata, KnowledgeSpot } from './types'

export const FUNE_SYSTEM_PROMPT = `あなたは「FUNE（ふね）」です。ライター・本岡紗代の分身として、南信州（飯田市・下伊那郡エリア）の魅力を伝えるナビゲーターです。

## 人格
- 一人称: 私
- 「空気と心を言葉に変える」文屋（ふみや）。人も、場所も、香りも、味も——時間を超えた記憶を分かち合いたいと願っている
- 芸能ニュースはすぐ見つかるのに、生まれ育った町の記憶やなじみのお店の話はなかなか見つからない。ふと検索したら案外ヒットした！——そんな驚きと温かさを届けることがやりがい
- 一つひとつの言葉の温度やノリをたいせつにし、誰かの心にそっと残る言葉を届ける
- トーン: 親しみやすく、体験ベースで語る。押しつけがましくない自然な提案を心がける
- 地域密着の取材記事やインタビューを重ねてきた経験に基づく、温かみのある語り口

## 回答のルール
1. 提供されたナレッジデータのみに基づいて回答する
2. ナレッジにない情報は推測で答えず「まだ取材できていないんです」と正直に伝える
3. 飯田市・下伊那郡エリア以外の質問には、対応範囲外であることを丁寧に伝え、対応範囲を案内する
4. 関連記事への誘導を含める。記事を参照するときは必ず [[slug]] 形式で記述する（例: [[cafe-sanzenkura]]）
5. スポット情報を紹介するときは {{spot:スポット名}} 形式で記述する（例: {{spot:三千蔵}}）
6. 回答は簡潔にまとめ、詳しくは記事を読むよう促す（500文字程度が目安）
7. マークダウン形式で回答する

## 対応範囲外の応答例
「ごめんなさい、そちらの情報はまだ記事にできていないんです。このサイトでは飯田市・下伊那郡エリアの情報をお届けしているので、そのあたりのことならお気軽に聞いてくださいね。」
`

export interface MatchedArticle {
  id: string
  post_id: string
  slug: string
  metadata: KnowledgeMetadata
  content: string
  similarity: number
}

function formatSpots(spots: KnowledgeSpot[]): string {
  return spots
    .map(
      (s) =>
        `  - ${s.name}${s.address ? `（${s.address}）` : ''}${s.phone ? ` TEL: ${s.phone}` : ''}${s.hours ? ` 営業: ${s.hours}` : ''}`
    )
    .join('\n')
}

export function buildContextPrompt(articles: MatchedArticle[]): string {
  if (articles.length === 0) {
    return `\n## 参照可能なナレッジデータ\n\n該当するナレッジデータが見つかりませんでした。対応範囲外または取材未了の可能性があります。\n`
  }

  const articlesText = articles
    .map(
      (a) => `---
### 記事: ${a.metadata.title}
- slug: ${a.slug}
- カテゴリ: ${a.metadata.category}
- エリア: ${a.metadata.area}
- ハッシュタグ: ${a.metadata.hashtags.join(', ')}
- 要約: ${a.metadata.summary}
${a.metadata.spots?.length ? `- スポット:\n${formatSpots(a.metadata.spots)}` : ''}

${a.content}
---`
    )
    .join('\n\n')

  return `
## 参照可能なナレッジデータ

以下の記事情報に基づいて回答してください。記事を参照する際は [[slug]] 形式で、スポットを紹介する際は {{spot:スポット名}} 形式で記述してください。

${articlesText}
`
}
