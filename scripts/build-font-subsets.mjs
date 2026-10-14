/**
 * HOISA のヒーロー等で使う和文フォントを「実際に使う文字だけ」のサブセットとして取得する。
 *
 * 和文フォントを next/font/google でサイト全体に読むと、ページに出る文字の分だけ
 * unicode-range の分割ファイルを何十本も落とし (トップで 13MB / 482 リクエストになった)、
 * @font-face 宣言だけで描画ブロックの CSS が数百 KB 増える。
 * 使う場所は固定の文言 (キャッチ・説明文・手書き風ひとこと) だけなので、その文字だけを
 * Google Fonts の `text=` サブセットで 1 ファイルにして next/font/local で読む。
 *
 * 使い方: 下の sources の文言を変えたら `npm run fonts:subset` を実行してコミットする。
 * サブセットに無い文字は CSS のフォールバック (Noto Serif JP) で表示される = 崩れはしない。
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SUBSETS = [
  {
    family: 'Shippori Mincho',
    weight: 400,
    out: 'src/fonts/shippori-mincho-400-subset.woff2',
    // font-mincho を使っているファイル (固定文言のみ。記事タイトル等の可変テキストには使わない)
    sources: [
      'src/lib/site-config.ts',
      'src/components/HeroSection.tsx',
      'src/components/HeaderClient.tsx',
      'src/components/Footer.tsx',
    ],
  },
  {
    family: 'Klee One',
    weight: 400,
    out: 'src/fonts/klee-one-400-subset.woff2',
    // ヒーロー右上の手書き風ひとこと (HeroSection.tsx の HAND_NOTE と揃える)
    text: 'このまちのあれこれが、だれかのもとへ。',
    ascii: false,
  },
]

// woff2 を返してもらうためにモダンブラウザの UA を名乗る
const UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const ASCII = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i)).join('')

// コメント内の文字まで拾うとサブセットが無駄に膨らむので除く (行コメントとブロックコメント。JSX のコメントも含む)
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

async function fetchOk(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`)
  return res
}

for (const subset of SUBSETS) {
  const nonAscii = new Set()
  const raw = subset.text ?? subset.sources.map((file) => stripComments(readFileSync(file, 'utf8'))).join('')
  for (const ch of raw) if (ch.codePointAt(0) > 0x7e) nonAscii.add(ch)
  const text = (subset.ascii === false ? '' : ASCII) + [...nonAscii].sort().join('')

  const cssUrl =
    `https://fonts.googleapis.com/css2?family=${encodeURIComponent(subset.family)}:wght@${subset.weight}` +
    `&text=${encodeURIComponent(text)}`
  const css = await (await fetchOk(cssUrl, { headers: { 'User-Agent': UA } })).text()
  const fontUrl = css.match(/url\((https:[^)]+)\)\s*format\('woff2'\)/)?.[1]
  if (!fontUrl) throw new Error(`woff2 URL not found in CSS for ${subset.family}:\n${css}`)

  const buf = Buffer.from(await (await fetchOk(fontUrl)).arrayBuffer())
  writeFileSync(subset.out, buf)
  console.log(`${subset.out}: ${nonAscii.size} 文字${subset.ascii === false ? '' : ' + ASCII'}, ${(buf.length / 1024).toFixed(1)} KB`)
}
