'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { EDITOR_ALLOWED_TAGS, formatEditorHtml } from '@/lib/editor-html'

/** 打つたびに本文へ反映すると重いので、手が止まってから反映する */
const APPLY_DELAY_MS = 400

/**
 * HTML 欄に書かれた、エディタが扱えないタグを拾う (画面に戻ると消える / 本文になるもの)。
 * DOMParser はブラウザでしか使えないので Client 専用。
 */
function findUnsupportedTags(html: string): string[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const found = new Set<string>()
  doc.body.querySelectorAll('*').forEach((el) => {
    const tag = el.tagName.toLowerCase()
    if (!EDITOR_ALLOWED_TAGS.has(tag)) {
      found.add(`<${tag}>`)
    } else if (tag === 'div' && el.getAttribute('data-type') !== 'box') {
      found.add('<div> (ボックス以外)')
    }
  })
  return [...found]
}

/**
 * 本文の HTML を直接書き換える欄 (WordPress の「コードエディター」にあたる)。
 * 書いた HTML は手が止まるたびにエディタへ読み込ませ、エディタがそろえた HTML を保存する
 * (= 扱えないタグはそのまま保存されない)。欄の文字は書き換えないので、打っている途中で崩れない。
 */
export function HtmlSourceEditor({ editor }: { editor: Editor }) {
  // 開いたときの本文で始める (以後は欄の文字が正。エディタ側の整形で上書きしない)
  const [source, setSource] = useState(() => formatEditorHtml(editor.getHTML()))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestRef = useRef(source)

  const unsupported = useMemo(() => findUnsupportedTags(source), [source])

  const apply = (html: string) => {
    // emitUpdate: true → RichTextEditorClient の onUpdate 経由でフォームの本文が更新される
    editor.commands.setContent(html, { emitUpdate: true })
  }

  const handleChange = (value: string) => {
    setSource(value)
    latestRef.current = value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => apply(value), APPLY_DELAY_MS)
  }

  // 閉じる (= 画面表示に戻る) とき、待ち中の分を必ず反映する
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        apply(latestRef.current)
      }
    }
    // apply は editor にしか依存しない。開いている間 editor は変わらない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="p-3">
      <p className="mb-2 text-xs leading-relaxed text-text-secondary">
        本文の HTML を直接書き換えられます。使えるタグ: h1〜h3 / p / ul・ol・li / blockquote / hr / br /
        strong / em / s / u / a / code / 画像 (figure・img・figcaption) / ボックス
        (<code>{'<div data-type="box">'}</code>)。
        書き換えた内容は自動で本文に反映されます。「画面表示に戻る」で確認してから保存してください。
      </p>
      <textarea
        value={source}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
        aria-label="本文の HTML"
        className="min-h-[400px] w-full resize-y rounded border border-border-decorative bg-gray-50 p-3 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {unsupported.length > 0 && (
        <p role="alert" className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          使えないタグがあります: {unsupported.join(' ')}
          。画面表示に戻すと、タグが消えるか普通の本文 (p) になります (中の文字は残ります)。
        </p>
      )}
    </div>
  )
}
