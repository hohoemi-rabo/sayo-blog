import { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'
import { ComingSoon } from '../_components/ComingSoon'

export const metadata: Metadata = {
  title: `ミニ記事のご相談（準備中） | ${SITE_CONFIG.name}`,
  description:
    'SNS で発信されている情報をもとに、紗代が短い紹介記事を書く「ミニ記事」の情報提供窓口。現在準備中です。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/mini`,
  },
}

export default function MiniRequestComingSoonPage() {
  return (
    <ComingSoon
      badge="ミニ記事の窓口"
      emoji="📩"
      title="もうすぐ、ここから「これ知ってほしい」を届けられます"
      lead="飯田下伊那の小さな出来事も、誰かに届くまで「無かったこと」になりがちです。SNS で発信されている情報を、紗代がミニ記事として Sayo's Journal で紹介する窓口を準備しています。"
      points={[
        'お店・イベント・団体の情報を、URL でお気軽に共有',
        '紗代が読みやすいミニ記事に書き起こします',
        '掲載は無料です',
      ]}
    />
  )
}
