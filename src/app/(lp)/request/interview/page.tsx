import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'
import { JsonLd } from '@/lib/structured-data'
import { LongLpForm } from './_components/LongLpForm'

export const metadata: Metadata = {
  title: '取材記事を相談する',
  description:
    '飯田下伊那のお店・活動・人物を、取材して記事にします。背景や想いまで聞き取り、あとから読み返せるWeb記事に。初期モニター500円 / 取材記事10,000円 / 深掘り記事30,000円。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/interview`,
  },
  openGraph: {
    title: `取材記事を相談する | ${SITE_CONFIG.name}`,
    description:
      '伝えたい想いを、読み返せる記事に。お店や活動の魅力を、言葉と写真で残します。',
    url: `${SITE_CONFIG.url}/request/interview`,
    type: 'website',
  },
}

// FAQ 構造化データ (リッチリザルト候補)
const FAQ_ITEMS = [
  {
    q: '投稿記事との違いは何ですか？',
    a: '投稿記事は、いただいた情報をもとに掲載する入口です。取材記事は、取材を通して背景や想いを聞き取り、読み物として整える記事です。',
  },
  {
    q: '500円記事はいつまで利用できますか？',
    a: 'サイトオープンから半年限定の初期モニター価格です。サイト全体で月2本まで受け付けます。期間終了後は、同内容を5,000円記事として継続する予定です。',
  },
  {
    q: 'AI記事とはどういう意味ですか？',
    a: 'AIを活用して記事の下書きや整理を行い、運営側が確認・編集して掲載する記事です。AIが勝手に公開するものではありません。',
  },
  {
    q: '1万円記事と3万円記事の違いは？',
    a: '1万円記事は、お店・活動・イベントの概要を読みやすく紹介する記事です。3万円記事は、代表者の想いや活動の背景、これまでの歩みまで深く残す読み物・人物記事です。',
  },
  {
    q: '写真撮影は含まれますか？',
    a: '1万円・3万円の現地取材プランには写真撮影を含みます。500円記事は原則として素材をご提供いただきます。',
  },
  {
    q: '原稿確認や修正はできますか？',
    a: '公開前に内容確認をお願いする予定です。事実関係の確認や軽微な修正は対応します。大幅な構成変更や追加取材が必要な場合は、別途ご相談となります。',
  },
  {
    q: '掲載までの日数はどのくらいですか？',
    a: '取材日、原稿確認、修正状況によりご相談となります。急ぎの掲載をご希望の場合は、事前にお知らせください。',
  },
  {
    q: '対応地域はどこですか？',
    a: '現地取材は飯田市・下伊那地域を中心に対応します。地域に関係する内容であれば、オンライン取材や遠方対応もご相談ください。遠方の場合は交通費等をご相談する場合があります。',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}

const creamGradient = {
  background: 'linear-gradient(180deg,#FFFFFF 0%, var(--cream) 100%)',
}

const PLANS = [
  {
    badge: '半年限定・サイト全体で月2本まで',
    name: '初期モニター記事',
    price: '¥500',
    unit: ' / 1本',
    items: [
      'サイトオープンから半年限定',
      '電話・オンラインで簡単に聞き取り',
      '写真・チラシなどの素材は先方提供',
      '現地取材・写真撮影は含みません',
      '期間終了後は5,000円記事として継続予定',
    ],
  },
  {
    badge: null,
    name: '取材記事',
    price: '¥10,000',
    unit: ' / 1本',
    items: [
      '出向いて取材',
      '写真撮影込み',
      '3,000文字まで',
      'お店・活動・イベントの紹介記事に',
    ],
  },
  {
    badge: null,
    name: '深掘り記事',
    price: '¥30,000',
    unit: ' / 1本',
    items: [
      '出向いて取材',
      '写真撮影込み',
      '文字制限なし',
      '代表者の想い、活動の背景、これまでの歩みまで',
    ],
  },
]

export default function LongRequestLpPage() {
  return (
    <>
      <JsonLd data={faqSchema} />

      <header className="header">
        <div className="wrap nav">
          <Link href="/" className="brand" aria-label="Sayo's Journal トップへ">
            Sayo&apos;s
            <br />
            Journal
          </Link>
          <nav className="navlinks">
            <a href="#about">取材記事とは</a>
            <a href="#plans">プラン</a>
            <a href="#flow">流れ</a>
            <a href="#faq">Q&amp;A</a>
            <span className="nav-sep" aria-hidden="true" />
            <Link href="/blog" className="nav-site">
              ブログ
            </Link>
            <Link href="/gallery" className="nav-site">
              ギャラリー
            </Link>
            <Link href="/about" className="nav-site">
              About
            </Link>
          </nav>
          <div className="actions">
            <a className="pill primary" href="#contact">
              取材記事を相談する
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-inner">
          <span className="label">取材記事・活動紹介</span>
          <h1 className="jp-hero">
            伝えたい想いを、
            <br />
            読み返せる記事に
          </h1>
          <p className="maincopy">お店や活動の魅力を、言葉と写真で残します。</p>
          <p className="subcopy">
            投稿記事だけでは伝えきれない背景や想いを、取材を通して整理します。お店、活動、人物、場所の魅力を、あとから読み返せるWeb記事に。
          </p>
          <div className="hero-buttons">
            <a className="btn main" href="#contact">
              取材記事を相談する
            </a>
            <a className="btn gold" href="#plans">
              記事プランを見る
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="about">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">About</div>
            <h2>告知だけでは伝わらないものを、取材で整えます。</h2>
            <p>
              活動の背景、代表者の想い、場所の空気感。チラシやSNSだけでは伝えきれない魅力を、読み物として残します。
            </p>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="icon">🎤</div>
              <h3>取材する</h3>
              <p>
                電話・オンライン・現地取材など、内容に合わせて聞き取ります。
              </p>
            </div>
            <div className="card">
              <div className="icon">📷</div>
              <h3>撮影する</h3>
              <p>現地取材プランでは、写真撮影も込みで空気感を伝えます。</p>
            </div>
            <div className="card">
              <div className="icon">📖</div>
              <h3>残す</h3>
              <p>公開後も検索され、読み返される地域の資産として残します。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="benefits">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Benefits</div>
            <h2>取材記事にすると、伝わり方が変わります。</h2>
            <p>
              ただのお知らせではなく、背景や人柄まで伝わる記事として残せます。
            </p>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="icon">🧭</div>
              <h3>魅力が整理される</h3>
              <p>
                何を伝えたいのか、誰に届けたいのか。取材を通して言葉にします。
              </p>
            </div>
            <div className="card">
              <div className="icon">📷</div>
              <h3>写真と一緒に残せる</h3>
              <p>
                現地取材プランでは写真撮影も込み。場所や人の雰囲気まで伝えます。
              </p>
            </div>
            <div className="card">
              <div className="icon">🔍</div>
              <h3>あとから見つかる</h3>
              <p>SNSで流れる情報を、検索されるWeb記事として残します。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="plans" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Plans</div>
            <h2>取材記事のプラン</h2>
            <p>伝えたい量と目的に合わせて選べます。</p>
          </div>
          <div className="plan-guide">
            <div>
              <b>まず試したい方</b>
              <span>初期モニター記事 / 500円</span>
            </div>
            <div>
              <b>お店・活動を紹介したい方</b>
              <span>取材記事 / 10,000円</span>
            </div>
            <div>
              <b>人物や背景まで残したい方</b>
              <span>深掘り記事 / 30,000円</span>
            </div>
          </div>
          <div className="planwrap">
            {PLANS.map((p) => (
              <div className="plan" key={p.name}>
                {p.badge && <div className="badge">{p.badge}</div>}
                <div className="name">{p.name}</div>
                <div className="price">
                  {p.price}
                  <span>{p.unit}</span>
                </div>
                <ul>
                  {p.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="note">
            ※500円記事はサイトオープンから半年限定・サイト全体で月2本までの初期モニター価格です。期間終了後は、同内容を5,000円記事として継続する予定です。
          </p>
        </div>
      </section>

      <section className="section" id="recommend">
        <div className="wrap">
          <div className="banner">
            <h2>こんなときに、取材記事がおすすめです。</h2>
            <p>
              新しいお店やサービスを紹介したいとき。活動の背景を伝えたいとき。イベント後の記録を残したいとき。代表者や参加者の想いまで、きちんと言葉にしたいとき。
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="prepare" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Before Contact</div>
            <h2>ご相談時に、分かる範囲で教えてください。</h2>
            <p>
              まだ決まっていないことがあっても大丈夫です。分かる範囲でお聞かせください。
            </p>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="icon">📝</div>
              <h3>紹介したい内容</h3>
              <p>お店、活動、イベント、人物など、何を記事にしたいか。</p>
            </div>
            <div className="card">
              <div className="icon">📅</div>
              <h3>希望時期</h3>
              <p>掲載したい時期や、イベント開催日、取材希望日など。</p>
            </div>
            <div className="card">
              <div className="icon">🖼️</div>
              <h3>素材の有無</h3>
              <p>写真、チラシ、SNS投稿、ホームページなど、参考になるもの。</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="flow">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Flow</div>
            <h2>取材の流れ</h2>
            <p>ご相談から公開まで、5つのステップで進めます。</p>
          </div>
          <div className="flow">
            <div className="step">
              <div className="num">1</div>
              <b>相談する</b>
              <p>フォームから内容を送る</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <b>確認する</b>
              <p>プラン・日程・素材を確認</p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <b>取材する</b>
              <p>聞き取り・写真撮影</p>
            </div>
            <div className="step">
              <div className="num">4</div>
              <b>執筆する</b>
              <p>原稿作成・内容確認</p>
            </div>
            <div className="step">
              <div className="num">5</div>
              <b>公開する</b>
              <p>Web記事として掲載</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="banner">
            <h2>読み返される記事は、未来の紹介状になる。</h2>
            <p>
              お店や活動の魅力を、一度きりの告知で終わらせず、検索される地域の記録として残します。
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Q&amp;A</div>
            <h2>詳しい条件</h2>
          </div>
          <div className="faqwrap">
            {FAQ_ITEMS.map((item, i) => (
              <details className="faq" key={item.q} open={i === 0}>
                <summary>{item.q}</summary>
                <div className="answer">
                  <p>{item.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta" id="contact">
        <div className="wrap">
          <div className="cta-box">
            <h2>取材記事を相談する</h2>
            <p>
              取材してほしい内容、掲載したい時期、迷っているプランなど、分かる範囲でお聞かせください。送信の時点で費用は発生しません。
            </p>
            <LongLpForm />
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="wrap">
          <Link href="/" className="fbrand">
            Sayo&apos;s Journal
          </Link>
          <p>地域の情報を、未来の資産に。</p>
          <nav className="footer-links">
            <Link href="/">トップ</Link>
            <Link href="/blog">ブログ</Link>
            <Link href="/gallery">ギャラリー</Link>
            <Link href="/request/post">投稿記事を送る</Link>
            <Link href="/privacy">プライバシーポリシー</Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
