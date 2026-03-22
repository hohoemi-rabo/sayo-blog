import { Metadata } from 'next'
import { SITE_CONFIG } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `プライバシーポリシー | ${SITE_CONFIG.name}`,
  description: `${SITE_CONFIG.name}のプライバシーポリシー。個人情報の取り扱いについて。`,
  alternates: {
    canonical: `${SITE_CONFIG.url}/privacy`,
  },
}

export default function PrivacyPage() {
  return (
    <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-playfair font-bold text-text-primary mb-8 text-center">
          Privacy Policy
        </h1>
        <div className="flex items-center justify-center mb-10">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="mx-3 w-1.5 h-1.5 rounded-full bg-primary" />
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>

        <div className="prose prose-sm md:prose-base max-w-none font-noto-serif-jp text-text-primary [&_h2]:font-playfair [&_h2]:text-xl [&_h2]:md:text-2xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-text-primary [&_p]:leading-relaxed [&_p]:text-text-secondary [&_li]:text-text-secondary">
          <p>
            {SITE_CONFIG.name}（以下「当サイト」）は、ユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシーを定めます。
          </p>

          <h2>個人情報の収集について</h2>
          <p>
            当サイトでは、お問い合わせの際に、お名前・メールアドレス等の個人情報をお伺いすることがあります。
            これらの個人情報は、お問い合わせへの回答や必要な情報のご連絡のために利用し、それ以外の目的では利用いたしません。
          </p>

          <h2>アクセス解析ツールについて</h2>
          <p>
            当サイトでは、Googleによるアクセス解析ツール「Google Analytics」を使用する場合があります。
            Google Analyticsはデータの収集のためにCookieを使用しています。このデータは匿名で収集されており、個人を特定するものではありません。
          </p>
          <p>
            この機能はCookieを無効にすることで収集を拒否することができますので、お使いのブラウザの設定をご確認ください。
            Google Analyticsの利用規約については、
            <a
              href="https://marketingplatform.google.com/about/analytics/terms/jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google アナリティクス利用規約
            </a>
            をご覧ください。
          </p>

          <h2>Cookie（クッキー）について</h2>
          <p>
            当サイトでは、一部のコンテンツにおいてCookieを利用しています。
            Cookieとは、Webサイトにアクセスした際にブラウザに保存される小さなテキストファイルです。
            Cookieによりユーザー個人を特定できる情報は取得しておりません。
            ブラウザの設定によりCookieを無効にすることも可能です。
          </p>

          <h2>著作権について</h2>
          <p>
            当サイトに掲載されている文章・画像・その他のコンテンツの著作権は、当サイト運営者または正当な権利を有する第三者に帰属します。
            無断での転載・複製・改変等はご遠慮ください。
            引用の際は、引用元として当サイトのリンクを明記してください。
          </p>

          <h2>免責事項</h2>
          <p>
            当サイトに掲載された情報については、可能な限り正確な情報を提供するよう努めておりますが、
            情報の正確性・最新性・有用性等について保証するものではありません。
            当サイトの情報を利用することで生じたいかなる損害についても、一切の責任を負いかねます。
          </p>
          <p>
            また、当サイトからリンクやバナーなどによって他のサイトに移動された場合、
            移動先サイトで提供される情報・サービス等について一切の責任を負いません。
          </p>

          <h2>リンクについて</h2>
          <p>
            当サイトは基本的にリンクフリーです。リンクを行う場合の許可や連絡は不要です。
            ただし、インラインフレームの使用や画像の直リンクはご遠慮ください。
          </p>

          <h2>プライバシーポリシーの変更</h2>
          <p>
            当サイトは、個人情報に関して適用される日本の法令を遵守するとともに、
            本ポリシーの内容を適宜見直し改善に努めます。
            修正された最新のプライバシーポリシーは常に本ページにて開示されます。
          </p>

          <p className="text-sm mt-10 text-text-secondary/70">
            制定日：2026年4月1日
          </p>
        </div>
      </div>
    </section>
  )
}
