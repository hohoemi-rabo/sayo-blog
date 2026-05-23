/**
 * 依頼管理画面の同期ヘルパー / 型。
 * ('use server' な actions.ts には同期 export を置けないため分離)
 */

export type InquiryTab = 'mini' | 'long'

export function parseInquiryTab(value: string | undefined): InquiryTab {
  return value === 'long' ? 'long' : 'mini'
}

export interface InquiryCounts {
  miniPending: number
  longPending: number
  miniTotal: number
  longTotal: number
}
