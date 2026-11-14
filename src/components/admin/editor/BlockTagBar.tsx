'use client'

import { useEditorState, type Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

/** ブロックの種類 → 画面に出す名前 (タグ名も添える) */
function blockLabel(name: string, level?: number): string | null {
  switch (name) {
    case 'paragraph':
      return '本文 (p)'
    case 'heading':
      return `見出し${level} (h${level})`
    case 'box':
      return 'ボックス'
    case 'blockquote':
      return '引用'
    case 'bulletList':
      return '箇条書き (ul)'
    case 'orderedList':
      return '番号付きリスト (ol)'
    case 'figure':
      return '画像'
    default:
      return null // listItem 等は出さない (箇条書きと二重になる)
  }
}

interface CursorBlockState {
  /** 外側 → 内側の順。例: ['ボックス', '見出し2 (h2)'] */
  path: string[]
  /** カーソルのある行の種類 */
  current: 'paragraph' | 'h1' | 'h2' | 'h3' | 'other'
  inBox: boolean
  inBlockquote: boolean
  inList: boolean
}

function readCursorBlock(editor: Editor): CursorBlockState {
  const { $from } = editor.state.selection
  const path: string[] = []
  let inBox = false
  let inBlockquote = false
  let inList = false
  for (let depth = 1; depth <= $from.depth; depth++) {
    const node = $from.node(depth)
    const label = blockLabel(node.type.name, node.attrs.level as number | undefined)
    if (label) path.push(label)
    if (node.type.name === 'box') inBox = true
    if (node.type.name === 'blockquote') inBlockquote = true
    if (node.type.name === 'listItem') inList = true
  }
  const parent = $from.parent
  const current =
    parent.type.name === 'paragraph'
      ? 'paragraph'
      : parent.type.name === 'heading' && [1, 2, 3].includes(parent.attrs.level as number)
        ? (`h${parent.attrs.level}` as 'h1' | 'h2' | 'h3')
        : 'other'
  return { path, current, inBox, inBlockquote, inList }
}

const CHOICES: Array<{ key: CursorBlockState['current']; label: string }> = [
  { key: 'paragraph', label: '本文 (p)' },
  { key: 'h2', label: '見出し2 (h2)' },
  { key: 'h3', label: '見出し3 (h3)' },
  { key: 'h1', label: '見出し1 (h1)' },
]

/**
 * 「タグを表示」中だけ出す、カーソル位置のタグの帯。
 * 上の行のタグ (見出し・ボックス・引用・箇条書き) を引き継いでしまったときに、
 * どこに入っているかを見て、本文に戻す / 外に出すためのもの。
 * Tiptap v3 は入力のたびに再描画しないので useEditorState でカーソル位置を追う。
 */
export function BlockTagBar({ editor }: { editor: Editor }) {
  const state = useEditorState({ editor, selector: ({ editor: e }) => readCursorBlock(e) })

  const setBlock = (key: CursorBlockState['current']) => {
    const chain = editor.chain().focus()
    if (key === 'paragraph') chain.setParagraph().run()
    else if (key !== 'other') chain.setHeading({ level: Number(key.slice(1)) as 1 | 2 | 3 }).run()
  }

  const buttonClass =
    'rounded border px-2 py-1 text-xs transition-colors border-gray-300 bg-white hover:bg-gray-100'

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border-decorative bg-amber-50/60 px-3 py-2 text-xs">
      <span className="text-text-secondary">
        カーソルの位置:{' '}
        <span className="font-medium text-text-primary">
          {state.path.length > 0 ? state.path.join(' › ') : '—'}
        </span>
      </span>

      {state.current !== 'other' && (
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="この行の種類">
          {CHOICES.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setBlock(c.key)}
              aria-pressed={state.current === c.key}
              className={cn(
                buttonClass,
                state.current === c.key && 'border-primary bg-primary/10 text-primary'
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {(state.inBox || state.inBlockquote || state.inList) && (
        <div className="flex flex-wrap items-center gap-1">
          {state.inBox && (
            <button type="button" className={buttonClass} onClick={() => editor.chain().focus().unsetBox().run()}>
              ボックスから出す
            </button>
          )}
          {state.inBlockquote && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => editor.chain().focus().lift('blockquote').run()}
            >
              引用から出す
            </button>
          )}
          {state.inList && (
            <button
              type="button"
              className={buttonClass}
              onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            >
              箇条書きから出す
            </button>
          )}
        </div>
      )}
    </div>
  )
}
