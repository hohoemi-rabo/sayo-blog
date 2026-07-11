import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_CONFIG } from '@/lib/site-config'
import { ARTICLE_ANGLES } from '@/lib/article-angles'
import { AngleDiagnosis } from './_components/AngleDiagnosis'

export const metadata: Metadata = {
  title: '投稿記事の切り口診断 — どの魅力を前に出す？',
  description:
    '同じ5つの投稿でも、どれを選ぶかで記事の印象は変わります。お店・活動・イベントの「どの魅力を前に出すか」を診断して、Sayo’s Journal に送る投稿の選び方を見つけてください。',
  alternates: {
    canonical: `${SITE_CONFIG.url}/request/post/guide`,
  },
  openGraph: {
    title: `投稿記事の切り口診断 | ${SITE_CONFIG.name}`,
    description:
      '同じ5つの投稿でも、どれを選ぶかで記事の印象は変わります。あなたに合う切り口を診断します。',
    url: `${SITE_CONFIG.url}/request/post/guide`,
    type: 'website',
  },
}

const creamGradient = {
  background: 'linear-gradient(180deg,#FFFFFF 0%, var(--cream) 100%)',
}

export default function ArticleAngleGuidePage() {
  return (
    <>
      <header className="header">
        <div className="wrap nav">
          <Link href="/" className="brand" aria-label="Sayo's Journal トップへ">
            Sayo&apos;s<br />Journal
          </Link>
          <nav className="navlinks">
            <a href="#about">切り口とは</a>
            <a href="#diagnosis">診断する</a>
            <a href="#types">7つの型</a>
            <span className="nav-sep" aria-hidden="true" />
            <Link href="/request/post" className="nav-site">
              投稿記事とは
            </Link>
            <Link href="/blog" className="nav-site">
              ブログ
            </Link>
            <Link href="/about" className="nav-site">
              About
            </Link>
          </nav>
          <div className="actions">
            <Link className="pill primary" href="/request/post#contact">
              📩 記事を掲載する
            </Link>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap hero-inner">
          <span className="label">投稿記事の使い方ガイド</span>
          <h1 className="jp-hero">
            あなたの投稿記事、
            <br />
            どの魅力を前に出す？
          </h1>
          <p className="maincopy">
            送る 5 投稿の選び方で、記事の印象は変わります。
          </p>
          <p className="subcopy">
            投稿記事は、SNS
            投稿やチラシをもとに、地域の情報をあとから見つかる記事として残す仕組みです。でも、ただ情報を並べるだけではもったいない。「どの魅力を前に出すか」で、届き方は変わります。まずは簡単な診断で、あなたに合う投稿の選び方を見つけてみてください。
          </p>
          <div className="hero-buttons">
            <a className="btn main" href="#diagnosis">
              診断をはじめる
            </a>
            <a className="btn gold" href="#types">
              7 つの型を先に見る
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="about" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">How to use</div>
            <h2>
              同じ 5 投稿でも、
              <br />
              選び方で「見え方」が変わります。
            </h2>
            <p>
              お店の全体像を伝える記事にも、メニューの幅を見せる記事にも、人柄や想いを伝える記事にもなります。
            </p>
          </div>
          <div className="grid3">
            <div className="card">
              <div className="icon">🌱</div>
              <h3>はじめて知る人へ</h3>
              <p>
                場所・営業時間・雰囲気・代表メニュー・ひとこと。この 5
                つを選ぶと、初めての人にも全体像が伝わります。
              </p>
            </div>
            <div className="card">
              <div className="icon">✨</div>
              <h3>強みを見せたい人へ</h3>
              <p>
                商品、サービス、技術、こだわり、人柄。何を前に出すかで、記事の主役が変わります。
              </p>
            </div>
            <div className="card">
              <div className="icon">🕊️</div>
              <h3>行動につなげたい人へ</h3>
              <p>
                参加方法、料金、駐車場、持ち物、初めての人への案内。不安が減ると、来店や参加につながります。
              </p>
            </div>
          </div>
          <p className="note">
            ※診断でわかるのは「送る投稿の選び方」です。新しく文章を書く必要はありません。手元にある
            SNS 投稿やチラシから、どれを選ぶかの目安にしてください。
          </p>
        </div>
      </section>

      <section className="section" id="diagnosis">
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">Diagnosis</div>
            <h2>投稿の選び方診断</h2>
            <p>
              「業種」ではなく、「どの魅力を前に出したいか」から考えます。近いものを選んでください。
            </p>
          </div>
          <AngleDiagnosis />
        </div>
      </section>

      {/*
        診断は JS で動くが、7 つの型の中身は静的 HTML としても出す。
        JS の中だけに置くとクロールされず、SEO 資産にならないため。
      */}
      <section className="section" id="types" style={creamGradient}>
        <div className="wrap">
          <div className="section-title">
            <div className="eyebrow">7 types</div>
            <h2>7 つの型と、送るとよい投稿</h2>
            <p>
              投稿記事の使い方はひとつではありません。目的に合わせて、前に出す魅力を変えられます。
            </p>
          </div>

          <div className="type-list">
            {ARTICLE_ANGLES.map((angle, i) => (
              <article className="type-card" key={angle.key} id={angle.key}>
                <div className="type-head">
                  <span className="type-num">{i + 1}</span>
                  <div>
                    <h3>{angle.title}</h3>
                    <p className="type-lead">{angle.lead}</p>
                  </div>
                </div>
                <p className="type-copy">{angle.copy}</p>
                <h4>送るとよい 5 つの投稿</h4>
                <ol className="type-picks">
                  {angle.picks.map((pick) => (
                    <li key={pick}>{pick}</li>
                  ))}
                </ol>
                <p className="type-impression">{angle.impression}</p>
                <Link
                  className="type-cta"
                  href={`/request/post?angle=${angle.key}#contact`}
                >
                  この型で投稿記事を送る →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="banner">
            <h2>迷ったままでも、送って大丈夫です。</h2>
            <p>
              型が決まらなくても、手元にある投稿やチラシを送っていただければ、こちらで整理します。「自分たちの魅力がどこにあるのか分からない」「もっと丁寧に背景まで伝えたい」というときは、取材記事として一緒に掘り起こすこともできます。
            </p>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="wrap">
          <div className="cta-box">
            <h2>選び方が決まったら、送るだけ。</h2>
            <p>
              SNS 投稿の URL を貼るか、チラシを 1
              枚選ぶだけで大丈夫です。掲載は無料です。
            </p>
            <div className="hero-buttons">
              <Link className="btn main" href="/request/post#contact">
                📩 投稿記事を送る
              </Link>
              <Link className="btn gold" href="/request/interview">
                取材記事について見る
              </Link>
            </div>
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
            <Link href="/request/post">投稿記事</Link>
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
