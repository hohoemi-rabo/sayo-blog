'use client'

import dynamic from 'next/dynamic'

const RichTextEditorClient = dynamic(
  () => import('./RichTextEditorClient').then((mod) => mod.RichTextEditorClient),
  {
    ssr: false,
    loading: () => (
      <div className="border border-border-decorative rounded-lg overflow-hidden bg-white">
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border-decorative bg-gray-50 h-12" />
        <div className="min-h-[400px] p-4 animate-pulse bg-gray-50" />
      </div>
    ),
  }
)

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  onImageUpload?: () => void
  placeholder?: string
}

export function RichTextEditor(props: RichTextEditorProps) {
  return <RichTextEditorClient {...props} />
}
