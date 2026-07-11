'use client'

import { useState } from 'react'
import Link from 'next/link'
import { RotateCcw, ArrowLeft, Layers } from 'lucide-react'
import {
  ANGLE_QUESTIONS,
  findArticleAngle,
  type ArticleAngleKey,
} from '@/lib/article-angles'

/**
 * 投稿記事の切り口診断。
 * 「業種」ではなく「どの魅力を前に出したいか」で分岐し、送る投稿の選び方を示す。
 * 結果は /request/post?angle=... に引き継いで、依頼と一緒に紗代さんへ届く。
 */
export function AngleDiagnosis() {
  // 直前の質問へ戻れるように、辿った質問 id を積む
  const [history, setHistory] = useState<string[]>(['q1'])
  const [result, setResult] = useState<ArticleAngleKey | null>(null)

  const currentId = history[history.length - 1]
  const question = ANGLE_QUESTIONS.find((q) => q.id === currentId)
  const angle = findArticleAngle(result)

  const total = ANGLE_QUESTIONS.length
  const progress = result ? 100 : Math.round((history.length / (total - 1)) * 60)

  function choose(choice: { next?: string; result?: ArticleAngleKey }) {
    if (choice.result) {
      setResult(choice.result)
      return
    }
    if (choice.next) setHistory((prev) => [...prev, choice.next!])
  }

  function back() {
    if (result) {
      setResult(null)
      return
    }
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev))
  }

  function restart() {
    setHistory(['q1'])
    setResult(null)
  }

  /**
   * 7 型の一覧へ送り、自分の型のカードをハイライトして着地させる。
   * 結果パネルと型カードは中身が同じなので、単に飛ばすだけだと同じ文章を 2 度読ませることになる。
   * 「ほかと見くらべる」ための移動だと分かるように、着地先を光らせる。
   */
  function compare(key: ArticleAngleKey) {
    const card = document.getElementById(key)
    if (!card) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    card.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      block: 'center',
    })
    card.classList.add('is-current')
    window.setTimeout(() => card.classList.remove('is-current'), 2600)
  }

  return (
    <div className="dg">
      <div className="dg-progress">
        <span>{result ? '結果' : `質問 ${history.length}`}</span>
        <div className="dg-bar">
          <div className="dg-fill" style={{ width: `${progress}%` }} />
        </div>
        <span>結果</span>
      </div>

      {angle ? (
        <div className="dg-result">
          <div className="dg-badge">診断結果</div>
          <h3>{angle.title}</h3>
          <p className="dg-result-copy">{angle.copy}</p>

          <div className="dg-result-grid">
            <div className="dg-box">
              <h4>送るとよい 5 つの投稿</h4>
              <ol>
                {angle.picks.map((pick) => (
                  <li key={pick}>{pick}</li>
                ))}
              </ol>
            </div>
            <div className="dg-box">
              <h4>できあがる記事の印象</h4>
              <p>{angle.impression}</p>
            </div>
          </div>

          <p className="dg-note">
            手元の SNS 投稿から、この 5
            つに当てはまるものを選んで送ってください。ぴったり 5
            件そろわなくても大丈夫です。チラシで宣伝している方は、この 5
            つがチラシに載っているかを確かめる目安に使えます。
          </p>

          <div className="dg-actions">
            <Link
              className="btn main"
              href={`/request/post?angle=${angle.key}#contact`}
            >
              この型で投稿記事を送る
            </Link>
            <button
              type="button"
              className="btn gold"
              onClick={() => compare(angle.key)}
            >
              <Layers className="h-4 w-4" /> ほかの型と見くらべる
            </button>
          </div>

          <div className="dg-subactions">
            <button type="button" className="dg-back" onClick={back}>
              <ArrowLeft className="h-4 w-4" /> 前の質問にもどる
            </button>
            <button type="button" className="dg-back" onClick={restart}>
              <RotateCcw className="h-4 w-4" /> もう一度診断する
            </button>
          </div>
        </div>
      ) : question ? (
        <div className="dg-question" key={question.id}>
          <div className="dg-qlabel">質問 {history.length}</div>
          <h3>{question.heading}</h3>
          <p className="dg-lead">{question.lead}</p>

          <div className="dg-choices">
            {question.choices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                className="dg-choice"
                onClick={() => choose(choice)}
              >
                <b>{choice.label}</b>
                <span>{choice.detail}</span>
              </button>
            ))}
          </div>

          {history.length > 1 && (
            <div className="dg-backrow">
              <button type="button" className="dg-back" onClick={back}>
                <ArrowLeft className="h-4 w-4" /> 前の質問にもどる
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
