'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Code,
  Minus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorImagePicker } from './EditorImagePicker'

interface RichTextEditorClientProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

// Singleton cache for extensions to prevent React StrictMode duplication warning
const extensionsCache = new Map<string, ReturnType<typeof createBaseExtensions>>()

function createBaseExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    TiptapImage.configure({
      HTMLAttributes: {
        class: 'max-w-full h-auto rounded-lg',
      },
    }),
    TiptapLink.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary underline',
      },
    }),
    Placeholder.configure({
      placeholder,
    }),
  ]
}

function getExtensions(placeholder: string) {
  const cacheKey = placeholder
  if (!extensionsCache.has(cacheKey)) {
    extensionsCache.set(cacheKey, createBaseExtensions(placeholder))
  }
  return extensionsCache.get(cacheKey)!
}

export function RichTextEditorClient({
  content,
  onChange,
  placeholder = '記事の本文を入力...',
}: RichTextEditorClientProps) {
  const [showImagePicker, setShowImagePicker] = useState(false)

  const editor = useEditor(
    {
      extensions: getExtensions(placeholder),
      content,
      onUpdate: ({ editor }) => {
        onChange(editor.getHTML())
      },
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose max-w-none min-h-[400px] p-4 focus:outline-none',
        },
      },
      immediatelyRender: false,
    },
    []
  )

  if (!editor) {
    return (
      <div className="border border-border-decorative rounded-lg overflow-hidden bg-white">
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border-decorative bg-gray-50 h-12" />
        <div className="min-h-[400px] p-4 animate-pulse bg-gray-50" />
      </div>
    )
  }

  const ToolbarButton = ({
    isActive = false,
    onClick,
    disabled = false,
    children,
    title,
  }: {
    isActive?: boolean
    onClick: () => void
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'p-2 rounded hover:bg-gray-100 transition-colors',
        isActive && 'bg-gray-100 text-primary',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )

  const addLink = () => {
    const url = window.prompt('URLを入力してください:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleImageSelect = (url: string) => {
    editor.chain().focus().setImage({ src: url }).run()
  }

  return (
    <div className="border border-border-decorative rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border-decorative bg-gray-50">
        <ToolbarButton
          isActive={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="見出し1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="見出し2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="見出し3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="太字"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="斜体"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="取り消し線"
        >
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="インラインコード"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="箇条書き"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="番号付きリスト"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="引用"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="水平線"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        <ToolbarButton
          isActive={editor.isActive('link')}
          onClick={addLink}
          title="リンク"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => setShowImagePicker(true)}
          title="画像"
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="元に戻す"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="やり直す"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Image Picker */}
      <EditorImagePicker
        open={showImagePicker}
        onOpenChange={setShowImagePicker}
        onSelect={handleImageSelect}
      />
    </div>
  )
}
