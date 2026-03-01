import { Tags } from 'lucide-react'

export default function AiTagsPage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <Tags className="w-8 h-8 text-gray-400" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary">AI Tags</h1>
      <p className="text-text-secondary">Ticket 27 で実装予定</p>
    </div>
  )
}
