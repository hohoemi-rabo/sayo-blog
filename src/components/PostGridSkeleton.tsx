// 記事一覧のストリーミング中に表示するスケルトン (blog / category 共通)
export default function PostGridSkeleton() {
  return (
    <div className="py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-background border border-border-decorative rounded-xl overflow-hidden animate-pulse"
          >
            <div className="aspect-[4/3] bg-background-dark/10" />
            <div className="p-5 space-y-3">
              <div className="h-6 bg-background-dark/10 rounded w-3/4" />
              <div className="h-4 bg-background-dark/10 rounded w-full" />
              <div className="h-4 bg-background-dark/10 rounded w-5/6" />
              <div className="flex gap-2">
                <div className="h-6 bg-background-dark/10 rounded w-16" />
                <div className="h-6 bg-background-dark/10 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
