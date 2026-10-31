import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostWithRelations } from '@/lib/types'
import { SUMMARY_ANCHOR_ID, SUMMARY_LEVELS, type SummaryLevel } from '@/lib/summary-levels'
import { formatDotDate, postHref } from '@/lib/home-posts'

/**
 * 注: globals.css が素の <a> をピンクにするため、カード内のリンクは文字色を明示している。
 *
 * トップのヒーロー直下の 3 枠 (デザイン案 s1.png): 特集 / みんなの投稿 (最新の投稿記事, 内部名 report) / ランダムな記事 (見出し無し)。
 * どの記事を出すかは `getHomePosts()` が決める (Pick Up との重複除外もそちら)。
 */
export default function HomeHighlights({
  feature,
  report,
  randomPosts,
}: {
  feature: PostWithRelations | null
  report: PostWithRelations | null
  randomPosts: PostWithRelations[]
}) {
  if (!feature && !report && randomPosts.length === 0) return null

  return (
    <section
      aria-label="注目の記事"
      className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 -mt-6 lg:-mt-10 pb-4"
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
        {feature && <FeatureCard post={feature} className="md:col-span-2 xl:col-span-6" />}
        {report && <ReportCard post={report} className="xl:col-span-3" />}
        {randomPosts.length > 0 && <RandomPostList posts={randomPosts} className="xl:col-span-3" />}
      </div>
    </section>
  )
}

function excerptOf(post: PostWithRelations): string {
  return post.excerpt?.trim() || post.summary_short?.trim() || ''
}

function categoryOf(post: PostWithRelations) {
  return post.post_categories?.[0]?.categories
}

/* ------------------------------------------------------------------ */

function FeatureCard({ post, className }: { post: PostWithRelations; className?: string }) {
  const href = postHref(post)
  const category = categoryOf(post)
  const summaryLevels = (['short', 'medium', 'long'] as const).filter(
    (level) => post[`summary_${level}`]?.trim()
  )

  return (
    <article
      className={cn(
        'group relative isolate flex min-h-[26rem] flex-col justify-end overflow-hidden rounded-3xl bg-background-dark shadow-[0_18px_40px_rgba(45,43,41,0.18)] xl:min-h-[25rem]',
        className
      )}
    >
      {post.thumbnail_url && (
        <Image
          src={post.thumbnail_url}
          alt=""
          fill
          sizes="(min-width: 1280px) 50vw, 100vw"
          className="-z-10 object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/35 to-black/0" />

      <Label className="absolute left-5 top-5">特集</Label>

      <div className="p-6 sm:p-8">
        <h2 className="font-noto-serif-jp text-xl sm:text-2xl xl:text-[1.7rem] font-bold leading-snug text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.35)]">
          {/* カード全体ではなくタイトルをリンクにし、after で面全体をクリック可能にする (中の要約リンクと入れ子にしない) */}
          <Link href={href} className="text-white hover:text-white after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline">
            {post.title}
          </Link>
        </h2>
        {excerptOf(post) && (
          <p className="mt-3 line-clamp-2 max-w-2xl font-noto-sans-jp text-sm leading-relaxed text-white/85">
            {excerptOf(post)}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3 font-noto-sans-jp text-sm text-white/85">
            <time dateTime={post.published_at}>{formatDotDate(post.published_at)}</time>
            {category && (
              <Link
                href={`/${category.slug}`}
                className="relative z-10 rounded-full border border-white/60 px-3 py-1 text-xs text-white hover:text-white hover:bg-white/15"
              >
                {category.name}
              </Link>
            )}
          </div>

          {summaryLevels.length > 0 && <SummaryLinks href={href} levels={summaryLevels} />}
        </div>
      </div>
    </article>
  )
}

/** 「AI要約で読む」: 押した長さの要約が開いた状態で記事ページへ */
function SummaryLinks({ href, levels }: { href: string; levels: SummaryLevel[] }) {
  return (
    <div className="relative z-10 rounded-2xl bg-white/95 px-3 pb-3 pt-2 shadow-lg">
      <p className="mb-2 flex items-center justify-center gap-1 font-noto-sans-jp text-xs font-medium text-text-primary">
        <Sparkles className="h-3.5 w-3.5 text-hoisa" aria-hidden="true" />
        AI要約で読む
      </p>
      <div className="flex gap-1.5">
        {levels.map((level, i) => (
          <Link
            key={level}
            href={`${href}?summary=${level}#${SUMMARY_ANCHOR_ID}`}
            aria-label={`${SUMMARY_LEVELS[level].label}(${SUMMARY_LEVELS[level].readingTime})で要約を読む`}
            className={cn(
              'rounded-full px-4 py-1.5 font-noto-sans-jp text-xs font-medium transition-colors',
              i === 0
                ? 'bg-gradient-to-r from-hoisa-light to-hoisa text-white'
                : 'bg-hoisa/5 text-text-secondary hover:bg-hoisa/10 hover:text-hoisa'
            )}
          >
            {SUMMARY_LEVELS[level].label}
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function ReportCard({ post, className }: { post: PostWithRelations; className?: string }) {
  const href = postHref(post)
  const category = categoryOf(post)

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-3xl border border-hoisa/10 bg-white shadow-[0_12px_32px_rgba(224,82,127,0.08)]',
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-hoisa/5">
        {post.thumbnail_url && (
          <Image
            src={post.thumbnail_url}
            alt=""
            fill
            sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
            className={cn(
              'object-cover transition-transform duration-700 group-hover:scale-[1.04]',
              post.event_ended && 'grayscale'
            )}
          />
        )}
        <Label className="absolute left-4 top-4">みんなの投稿</Label>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="font-noto-serif-jp text-lg font-bold leading-snug text-text-primary line-clamp-3">
          <Link href={href} className="text-text-primary hover:text-hoisa after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:underline">
            {post.title}
          </Link>
        </h2>
        {excerptOf(post) && (
          <p className="mt-2 line-clamp-2 font-noto-sans-jp text-sm leading-relaxed text-text-secondary">
            {excerptOf(post)}
          </p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-4 font-noto-sans-jp text-sm text-text-secondary">
          <time dateTime={post.published_at}>{formatDotDate(post.published_at)}</time>
          {category && (
            <Link
              href={`/${category.slug}`}
              className="relative z-10 rounded-full border border-hoisa/40 px-3 py-1 text-xs text-hoisa hover:bg-hoisa/5"
            >
              {category.name}
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

/* ------------------------------------------------------------------ */

function RandomPostList({ posts, className }: { posts: PostWithRelations[]; className?: string }) {
  return (
    <section
      // 見出しは置かない方針 (「もっと見る」だけ)。スクリーンリーダー向けの名前だけ付ける
      aria-label="ほかの記事"
      className={cn(
        'rounded-3xl border border-hoisa/10 bg-white/90 p-5 shadow-[0_12px_32px_rgba(224,82,127,0.08)]',
        className
      )}
    >
      <div className="mb-1 flex justify-end">
        <Link
          href="/blog"
          className="group inline-flex items-center gap-1 font-noto-sans-jp text-xs text-hoisa hover:text-text-primary"
        >
          もっと見る
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>

      <ul className="divide-y divide-hoisa/10">
        {posts.map((post) => (
          <li key={post.id}>
            <Link href={postHref(post)} className="group flex gap-3 py-3 focus:outline-none">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-hoisa/5">
                {post.thumbnail_url && (
                  <Image
                    src={post.thumbnail_url}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-noto-sans-jp text-xs text-text-secondary">
                  {formatDotDate(post.published_at)}
                </p>
                <p className="mt-0.5 line-clamp-2 font-noto-sans-jp text-sm font-medium leading-snug text-text-primary group-hover:text-hoisa group-focus-visible:underline">
                  {post.title}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'z-10 rounded-full bg-white/90 px-3 py-1 font-noto-sans-jp text-xs font-semibold tracking-wider text-hoisa shadow-sm',
        className
      )}
    >
      {children}
    </span>
  )
}
