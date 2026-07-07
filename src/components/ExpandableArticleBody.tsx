'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * 記事本文を「続きを読む」で展開する折りたたみラッパー。
 *
 * SEO のため本文の全文は SSR で HTML に出力済み (children = <ArticleBody>)。
 * ここでは **見た目だけ** CSS で冒頭をクランプし、クリックで残りを開く。
 * JS で後から本文を取得するのではないので、検索エンジンは常に全文を読める。
 *
 * - 折りたたみ高さより本文が短い記事では、ボタン/フェードを出さない (実測して判定)。
 * - TOC やアンカーリンクで隠れた見出しへ飛ぶ事故を防ぐため、ハッシュ変化で自動展開。
 */

const COLLAPSED_MAX_PX = 512 // 冒頭のティーザー高さ (= 32rem)
// これ以上はみ出すときだけ折りたたむ (わずかな超過で無意味なボタンを出さない)
const COLLAPSE_THRESHOLD_PX = COLLAPSED_MAX_PX + 96

/** TOC などから本文の展開を促すカスタムイベント名 (TableOfContents が dispatch) */
export const EXPAND_EVENT = 'article-body:expand'

// SSR 中の useLayoutEffect 警告を避けつつ、クライアントでは描画前に実測する
const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect

export default function ExpandableArticleBody({
  children,
}: {
  children: React.ReactNode
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  // 初期は「折りたたみ要」と仮定 (長い記事が大半のため、実測まで長文をクランプ表示)
  const [needsCollapse, setNeedsCollapse] = useState(true)

  useIsoLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    // overflow:hidden でも scrollHeight は全文の高さを返す
    if (el.scrollHeight <= COLLAPSE_THRESHOLD_PX) {
      setNeedsCollapse(false)
    }
  }, [])

  useEffect(() => {
    // TOC クリックやアンカーで見出しへ飛ぶときは、隠れた見出しへ飛ぶ事故を防ぐため
    // 先に全文を開く。TOC は window.scrollTo (ハッシュ非使用) なのでカスタムイベントも購読。
    const expand = () => setExpanded(true)
    if (window.location.hash) expand()
    window.addEventListener('hashchange', expand)
    window.addEventListener(EXPAND_EVENT, expand)
    return () => {
      window.removeEventListener('hashchange', expand)
      window.removeEventListener(EXPAND_EVENT, expand)
    }
  }, [])

  const clamped = needsCollapse && !expanded

  return (
    <div>
      <div
        ref={contentRef}
        className={clamped ? 'relative overflow-hidden' : undefined}
        style={clamped ? { maxHeight: COLLAPSED_MAX_PX } : undefined}
      >
        {children}
        {clamped && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent"
          />
        )}
      </div>

      {clamped && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            className="inline-flex items-center gap-2 rounded-full border border-primary px-6 py-3 font-noto-sans-jp text-primary transition-colors duration-200 hover:bg-primary hover:text-white"
          >
            続きを読む
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
