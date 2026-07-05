/**
 * AI 3段階要約のレベル定義 (表示ラベル / 読了時間 / 生成ルール)。
 *
 * このファイルは **サーバ専用コードを一切 import しない純粋な定数モジュール**。
 * 管理フォーム (SummarySection) と公開スライダー (SummarySlider) の両 Client Component、
 * および生成ロジック (summary-generator.ts / Server) が共通で参照する。
 * Gemini クライアントを含む summary-generator を Client から import するとサーバ専用の
 * `@google/generative-ai` がクライアントバンドルに混入するため、定数はここに置く。
 */

export type SummaryLevel = 'short' | 'medium' | 'long'

export interface SummaryLevelConfig {
  /** UI ラベル */
  label: string
  /** 一括生成プロンプトの区切りマーカー */
  marker: string
  /** 目安の読了時間 (公開 UI 表示用) */
  readingTime: string
  /** プロンプトに埋め込む文字数・改行ルールの指示文 */
  instruction: string
}

export const SUMMARY_LEVELS: Record<SummaryLevel, SummaryLevelConfig> = {
  short: {
    label: 'さくっと',
    marker: 'さくっと',
    readingTime: '約30秒',
    instruction:
      '150文字以内(絶対に200文字を超えない)。改行を入れず1段落で。要点だけを一息で。',
  },
  medium: {
    label: 'ほどよく',
    marker: 'ほどよく',
    readingTime: '約1分',
    instruction:
      '400文字以内(絶対に500文字を超えない)。話題の変わり目で空行を入れ、2段落程度に。',
  },
  long: {
    label: 'じっくり',
    marker: 'じっくり',
    readingTime: '約3分',
    instruction:
      '800文字以内(絶対に1000文字を超えない)。話題ごとに空行を入れ、2〜3段落に。流れが分かるように。',
  },
}

export const SUMMARY_LEVEL_ORDER: SummaryLevel[] = ['short', 'medium', 'long']
