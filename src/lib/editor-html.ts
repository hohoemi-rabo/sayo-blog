/**
 * 記事エディタの「HTML で編集」用の決まりごと (Client / Server 両用・DOM 非依存)。
 *
 * 本文は Tiptap が扱える形にそろえてから保存する。ここに無いタグを HTML 欄に書いても、
 * 画面に戻ったとき (= Tiptap が読み込んだとき) に消えるか、普通の本文 (p) に変わる。
 */

/** HTML 欄で使えるタグ。BoxExtension (div[data-type="box"]) と FigureExtension (figure) を含む */
export const EDITOR_ALLOWED_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'br',
  'figure',
  'figcaption',
  'img',
  'a',
  'strong',
  'b',
  'em',
  'i',
  's',
  'del',
  'strike',
  'u',
  'code',
  'pre',
  'div', // ボックス (data-type="box") のときだけ有効。判定は呼び出し側
])

/** 行の頭に来るタグ。この前で改行して、1 行 = 1 ブロックで読めるようにする */
const BLOCK_START = /(?=<(?:h[1-3]|p|ul|ol|li|blockquote|hr|figure|div|pre)[\s>/])/g

/**
 * Tiptap の getHTML() は 1 行に詰めて返すので、ブロックごとに改行して読みやすくする。
 * ブロックの「間」にしか改行を入れないので、読み込み直しても内容は変わらない
 * (ブロック間の空白は Tiptap が無視する)。<pre> の中は触らない。
 */
export function formatEditorHtml(html: string): string {
  const parts = html.split(/(<pre[\s>][\s\S]*?<\/pre>)/)
  return parts
    .map((part, i) => (i % 2 === 1 ? `\n${part}` : part.replace(BLOCK_START, '\n')))
    .join('')
    .replace(/^\n+/, '')
}
