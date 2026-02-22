/**
 * Article content processing utilities
 * HTML見出しの抽出・id付与、TOCデータの生成
 */

export interface TocHeading {
  id: string
  text: string
  level: number
}

/**
 * HTML文字列から見出し（h2, h3）を抽出し、id属性を付与する
 * @returns processedHtml - id付与済みHTML, headings - 目次データ
 */
export function processArticleContent(html: string): {
  processedHtml: string
  headings: TocHeading[]
} {
  const headings: TocHeading[] = []
  const slugCount = new Map<string, number>()

  const processedHtml = html.replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tag: string, attrs: string, content: string) => {
      // HTMLタグを除去してプレーンテキストを取得
      const text = content.replace(/<[^>]*>/g, '').trim()
      if (!text) return match

      // idを生成（日本語テキスト対応）
      let baseSlug = text
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uF900-\uFAFF-]/g, '')
        .slice(0, 60)

      if (!baseSlug) baseSlug = `heading-${headings.length}`

      // 重複idの回避
      const count = slugCount.get(baseSlug) || 0
      slugCount.set(baseSlug, count + 1)
      const id = count > 0 ? `${baseSlug}-${count}` : baseSlug

      const level = parseInt(tag.charAt(1))
      headings.push({ id, text, level })

      // 既存のid属性を上書き、なければ追加
      if (/id=["']/.test(attrs)) {
        attrs = attrs.replace(/id=["'][^"']*["']/, `id="${id}"`)
      } else {
        attrs = ` id="${id}"${attrs}`
      }

      return `<${tag}${attrs}>${content}</${tag}>`
    }
  )

  return { processedHtml, headings }
}
