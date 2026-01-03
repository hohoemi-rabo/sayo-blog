interface ArticleBodyProps {
  content: string
}

export default function ArticleBody({ content }: ArticleBodyProps) {
  return (
    <div
      className="article-body prose prose-lg max-w-none font-noto-serif-jp
        prose-headings:font-playfair prose-headings:text-text-primary
        prose-h1:text-3xl prose-h1:lg:text-4xl prose-h1:font-bold prose-h1:mb-4
        prose-h2:text-2xl prose-h2:lg:text-3xl prose-h2:font-bold prose-h2:mt-8 prose-h2:mb-4
        prose-h3:text-xl prose-h3:lg:text-2xl prose-h3:font-semibold prose-h3:mt-6 prose-h3:mb-3
        prose-p:text-text-primary prose-p:leading-relaxed prose-p:mb-4
        prose-a:text-primary prose-a:no-underline prose-a:transition-all
        hover:prose-a:underline hover:prose-a:decoration-1 hover:prose-a:underline-offset-2
        hover:prose-a:text-primary-hover
        prose-strong:text-text-primary prose-strong:font-semibold
        prose-em:text-text-primary prose-em:italic
        prose-blockquote:border-l-4 prose-blockquote:border-primary/30 prose-blockquote:pl-4
        prose-blockquote:italic prose-blockquote:text-text-secondary
        prose-code:text-sm prose-code:bg-background-dark/5 prose-code:px-1 prose-code:py-0.5
        prose-code:rounded prose-code:before:content-[''] prose-code:after:content-['']
        prose-pre:bg-background-dark/90 prose-pre:text-background prose-pre:rounded-xl
        prose-pre:p-4 prose-pre:overflow-x-auto
        prose-img:rounded-xl prose-img:shadow-decorative
        prose-hr:border-border-decorative prose-hr:my-8
        prose-ul:list-disc prose-ul:pl-6 prose-ul:mb-4
        prose-ol:list-decimal prose-ol:pl-6 prose-ol:mb-4
        prose-li:text-text-primary prose-li:mb-2"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  )
}
