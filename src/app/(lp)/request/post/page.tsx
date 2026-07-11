import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'
import { JsonLd } from '@/lib/structured-data'
import { MiniLpForm } from './_components/MiniLpForm'

export const metadata: Metadata = {
  title: '投稿記事を掲載する',
  description:
    '飯田下伊那の告知・イベント情報・地域の話を、無料で記事掲載できる情報窓口。告知や自慢はもちろん、ご近所のちょっとした出来事や失敗談まで、紹介したい SNS 投稿の URL を送るだけで大丈夫です。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/post`,
  },
  openGraph: {
    title: `投稿記事を掲載する | ${SITE_CONFIG.name}`,
    description:
      '飯田下伊那の情報を、あとから見つかる記事に。告知・イベント・ご近所の話まで、無料で掲載できます。',
    url: `${SITE_CONFIG.url}/request/post`,
    type: 'website',
  },
}

// FAQ 構造化データ (リッチリザルト候補)
const FAQ_ITEMS = [
  {
    q: '投稿記事は誰でも送れますか？',
    a: '飯田下伊那に関係する情報であれば、個人・店舗・団体・イベント主催者など、どなたでも送っていただけます。',
  },
  {
    q: '投稿記事は必ず掲載されますか？',
    a: '必ず掲載されるものではありません。内容確認のうえ、掲載可否は運営側で判断します。',
  },
  {
    q: '何本まで送れますか？',
    a: '同一の個人・団体につき月1本を目安に受け付けます。受付状況により掲載時期をご相談する場合があります。',
  },
  {
    q: '掲載できない内容はありますか？',
    a: '誹謗中傷、権利関係が不明な画像、事実確認ができない内容、地域との関係が薄い内容は掲載を見送る場合があります。',
  },
  {
    q: '掲載した情報はSNSでも使われますか？',
    a: 'Sayo’s Journalの記事掲載に加えて、InstagramなどのSNS投稿やイベントまとめ・特集記事の中で紹介する場合があります。写真や文章の使用範囲については、投稿フォームで確認します。',
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

export default function MiniRequestLpPage() {
  return (
    <>
      <JsonLd data={faqSchema} />

      <header className="header">
        <div className="wrap nav">
          <Link href="/" className="brand" aria-label="Sayo's Journal トップへ">
            Sayo&apos;s<br />Journal
          </Link>
          <nav className="navlinks">
            <a href="#about">投稿記事とは</a>
            <a href="#contents">できること</a>
            <a href="#benefits">メリット</a>
            <a href="#flow">掲載方法</a>
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
              📩 記事を掲載する
            </a>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-inner">
          <span className="label">地域の掲示板</span>
          <h1 className="jp-hero">
            あなたの言葉が、
            <br />
            地域の記録になる
          </h1>
          <p className="maincopy">
            告知も、自慢も、失敗談も。無料で記事掲載できます。
          </p>
          <p className="subcopy">
            トレンド重視のSNSもいいけれど、地域の情報は流れて終わるだけではもったいない。告知・イベント情報・自慢・失敗談・おもしろい話まで、あなたの言葉で送ってください。
          </p>
          <div className="hero-buttons">
            <a className="btn main" href="#contact">
              📩 記事を掲載する
            </a>
            <a className="btn gold" href="#flow">
              掲載の流れを見る
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="about">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">About</div>
            <h2>投稿記事は、地域情報が集まる入口。</h2>
            <p>
              Sayo&apos;s Journalは、飯田下伊那の「今」を集め、検索しやすく、見返しやすく整える地域情報サイトです。
            </p>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="icon">📝</div>
              <h3>あなたの言葉で</h3>
              <p>投稿フォームから、伝えたいことをそのまま送れます。</p>
            </div>
            <div className="card">
              <div className="icon">🔍</div>
              <h3>検索しやすく</h3>
              <p>
                日付・場所・申込方法などを整えて掲載します。SEO対策にもつながります。
              </p>
            </div>
            <div className="card">
              <div className="icon">🌸</div>
              <h3>未来に残す</h3>
              <p>
                SNSで今を届け、Sayo&apos;s Journalで未来に残す。地域の情報を資産にします。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="contents" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Contents</div>
            <h2>投稿記事でできること</h2>
            <p>
              告知やイベント情報だけでなく、地域の小さな出来事や活動の記録も掲載できます。
            </p>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="icon">📣</div>
              <h3>告知・お知らせ</h3>
              <p>イベント、講座、マルシェ、展示、参加者募集など。</p>
            </div>
            <div className="card">
              <div className="icon">✨</div>
              <h3>自慢・おもしろい話</h3>
              <p>地域のちょっといい話、活動の工夫、誰かに話したくなる出来事。</p>
            </div>
            <div className="card">
              <div className="icon">🌱</div>
              <h3>失敗談・学び</h3>
              <p>やってみてわかったこと、次に活かしたいことも地域の財産です。</p>
            </div>
          </div>
          <p className="note">
            ※投稿記事は受付状況により掲載時期を調整する場合があります。掲載可否は内容確認のうえ、運営側で判断します。
          </p>
        </div>
      </section>

      <section className="section" id="benefits">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Benefits</div>
            <h2>SNSで流れた情報を、あとから見つかる記事に。</h2>
            <p>投稿記事を掲載すると、情報の届き方が少し変わります。</p>
          </div>
          <div className="benefit-grid">
            <div className="benefit">
              <b>検索で見つけてもらいやすくなる</b>
              <p>イベント名、場所、活動名などであとから探せる形に整えます。</p>
            </div>
            <div className="benefit">
              <b>SNSを見ていない人にも届く</b>
              <p>
                Instagramだけでは届きにくい人にも、Web記事として情報を届けられます。
              </p>
            </div>
            <div className="benefit">
              <b>チラシや投稿を残せる</b>
              <p>一度きりの告知を、あとから読み返せる地域の記録にします。</p>
            </div>
            <div className="benefit">
              <b>活動実績として使いやすい</b>
              <p>
                イベント後も、活動紹介や報告、次回告知の土台として活用できます。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="reuse" style={creamGradient}>
        <div className="wrap">
          <div className="reuse-box">
            <h2>掲載して終わりではなく、必要な人へ届け直します。</h2>
            <p>
              Sayo’s Journalに集まった情報は、Web記事として残すだけでなく、InstagramなどのSNS投稿や、イベントまとめ・特集記事の中で紹介することがあります。
            </p>
            <p>
              情報を一度掲載して終わりにせず、必要な人に届きやすい形へ整え、何度も見つけてもらえる導線をつくります。
            </p>
            <p className="note">
              ※写真や文章の使用範囲については、投稿フォームで確認します。
            </p>
            <div className="reuse-points">
              <div className="reuse-point">
                <div className="icon">📱</div>
                <b>SNSでも紹介</b>
                <span>Instagram投稿などで、見つけてもらう入口を増やします。</span>
              </div>
              <div className="reuse-point">
                <div className="icon">📅</div>
                <b>まとめ記事に活用</b>
                <span>
                  イベントまとめ・地域情報特集などで紹介する場合があります。
                </span>
              </div>
              <div className="reuse-point">
                <div className="icon">🔁</div>
                <b>情報を循環</b>
                <span>
                  Web記事、SNS、特集を行き来しながら情報を届け直します。
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="why-free">
        <div className="wrap">
          <div className="why-free">
            <h3>なんで無料で掲載できるの？</h3>
            <p>
              Sayo’s Journalは、地域情報が集まる場所を育てていくため、投稿記事の掲載を無料にしています。
            </p>
            <p>
              投稿記事が増えることで、サイト全体の情報量が増え、見に来る人にとっても、発信する人にとっても使いやすい場所になります。
            </p>
            <p>
              また、より深く伝えたい方には有料の取材記事を、Web機能を導入したい企業・団体には機能導入の相談窓口を用意しています。投稿記事は、Sayo’s Journalを一緒に育てるための入口です。
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="banner">
            <h2>掲載した情報は、こんな人に届きます。</h2>
            <p>
              週末の予定を探している人、地域の活動を知りたい人、新しいお店や講座に出会いたい人へ。Sayo&apos;s Journalは、投稿された情報をあとから見つけやすい形に整えます。
            </p>
          </div>
        </div>
      </section>

      <section className="section" id="flow">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Flow</div>
            <h2>投稿記事の掲載方法</h2>
            <p>投稿記事の掲載は、この流れで進みます。</p>
          </div>
          <div className="flow">
            <div className="step">
              <div className="num">1</div>
              <b>送る</b>
              <p>フォームから情報を送る</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <b>確認する</b>
              <p>内容と掲載可否を確認</p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <b>整える</b>
              <p>記事として見やすく整理</p>
            </div>
            <div className="step">
              <div className="num">4</div>
              <b>載せる</b>
              <p>Web記事として掲載</p>
            </div>
            <div className="step">
              <div className="num">5</div>
              <b>残す</b>
              <p>検索・カレンダーにも展開</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="faq" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Q&amp;A</div>
            <h2>詳しい掲載条件</h2>
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
            <h2>まずは、あなたの情報から。</h2>
            <p>
              告知・イベント情報・地域の話を、Sayo&apos;s Journalに送ってください。紹介したい SNS 投稿の URL を貼るだけで大丈夫です。
            </p>
            <MiniLpForm />
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
            <Link href="/request/interview">取材を依頼</Link>
            <Link href="/privacy">プライバシーポリシー</Link>
          </nav>
        </div>
      </footer>
    </>
  )
}
