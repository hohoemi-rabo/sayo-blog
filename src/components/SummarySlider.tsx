'use client'

import { useState } from 'react'
import { Sparkles, Clock } from 'lucide-react'
import { SUMMARY_LEVELS, type SummaryLevel } from '@/lib/summary-levels'

interface SummarySliderProps {
  summaryShort: string | null
  summaryMedium: string | null
  summaryLong: string | null
}

/**
 * 記事詳細の「さくっと / ほどよく / じっくり」3段階 AI 要約スライダー。
 *
 * 値のあるレベルだけを表示し、全部空なら何も描画しない。
 * セグメントの背景スライドは CSS transform のみ (framer-motion は使わない)。
 */
export function SummarySlider({
  summaryShort,
  summaryMedium,
  summaryLong,
}: SummarySliderProps) {
  const all: Array<{ level: SummaryLevel; text: string }> = [
    { level: 'short', text: summaryShort ?? '' },
    { level: 'medium', text: summaryMedium ?? '' },
    { level: 'long', text: summaryLong ?? '' },
  ]
  const available = all.filter((l) => l.text.trim().length > 0)

  // Hook order は常に一定に保つため、早期 return の前に useState を呼ぶ
  const [selected, setSelected] = useState<SummaryLevel>(
    available[0]?.level ?? 'short'
  )

  if (available.length === 0) return null

  const activeIndex = Math.max(
    0,
    available.findIndex((l) => l.level === selected)
  )
  const active = available[activeIndex] ?? available[0]
  const activeCfg = SUMMARY_LEVELS[active.level]

  return (
    <section
      aria-label="AI要約"
      className="mb-8 rounded-2xl border border-border-decorative bg-background/60 p-5 sm:p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-text-primary">AI要約</h2>
        <span className="ml-auto flex items-center gap-1 text-xs text-text-secondary">
          <Clock className="h-3.5 w-3.5" />
          {activeCfg.readingTime}で読める
        </span>
      </div>

      {/* セグメントスライダー (CSS transform で背景をスライド) */}
      <div
        role="tablist"
        aria-label="要約の長さ"
        className="relative flex rounded-full bg-gray-100 p-1"
      >
        {/* スライドする選択中の背景 */}
        <span
          aria-hidden="true"
          className="absolute inset-y-1 left-1 rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out"
          style={{
            width: `calc((100% - 0.5rem) / ${available.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {available.map((l) => {
          const cfg = SUMMARY_LEVELS[l.level]
          const isActive = l.level === active.level
          return (
            <button
              key={l.level}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSelected(l.level)}
              className={`relative z-10 flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      {/* 要約本文 (key で作り直して軽くフェードイン) */}
      <p
        key={active.level}
        className="animate-slide-in-up mt-4 whitespace-pre-line text-sm leading-relaxed text-text-primary sm:text-base"
      >
        {active.text}
      </p>

      {/* 本文への橋渡し (要約があるときだけ表示 = このコンポーネント内) */}
      <div className="mt-5 border-t border-border-decorative/60 pt-4 text-center">
        <div
          className="mb-2 flex items-center justify-center"
          aria-hidden="true"
        >
          <span className="h-1 w-1 rounded-full bg-primary/60" />
          <span className="mx-2 h-px w-10 bg-gradient-to-r from-transparent to-primary/50" />
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="mx-2 h-px w-10 bg-gradient-to-l from-transparent to-primary/50" />
          <span className="h-1 w-1 rounded-full bg-primary/60" />
        </div>
        <p className="text-sm leading-relaxed text-text-secondary">
          この先は、写真とともに本文で。
          <br />
          全文を読みたい方は、このまま下へ。
        </p>
      </div>
    </section>
  )
}
