import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-7xl md:text-9xl font-playfair font-bold text-primary mb-4">
        404
      </h1>
      <p className="text-xl md:text-2xl font-noto-serif-jp text-text-primary mb-2">
        ページが見つかりません
      </p>
      <p className="text-text-secondary font-noto-sans-jp mb-8">
        お探しのページは移動または削除された可能性があります
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-primary text-primary font-noto-sans-jp hover:bg-primary hover:text-white transition-colors duration-200"
      >
        <ArrowLeft className="w-4 h-4" />
        ホームに戻る
      </Link>
    </div>
  )
}
