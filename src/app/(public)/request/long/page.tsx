import { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'
import { ComingSoon } from '../_components/ComingSoon'

export const metadata: Metadata = {
  title: `取材のご依頼（準備中） | ${SITE_CONFIG.name}`,
  description:
    '紗代が直接取材にうかがって書く「ロング記事」の取材依頼窓口。お店・団体・活動の魅力をじっくりお伝えします。現在準備中です。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/long`,
  },
}

export default function LongRequestComingSoonPage() {
  return (
    <ComingSoon
      badge="取材依頼の窓口"
      emoji="✍️"
      title="もうすぐ、取材のご依頼を受け付けます"
      lead="「うちの活動を、紗代さんに直接取材して書いてほしい」。そんなご要望にお応えする取材依頼の窓口を準備しています。お店・団体・活動の魅力を、じっくり丁寧にお届けします。"
      points={[
        '紗代が現地に伺って取材・執筆します',
        '取材日や公開時期は個別にご相談',
        '取材記事は有料です（500円〜・内容に応じてご相談）',
      ]}
    />
  )
}
