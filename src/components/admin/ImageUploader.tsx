'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import { cn } from '@/lib/utils'
import { MediaPickerDialog } from './MediaPickerDialog'

interface ImageUploaderProps {
  value: string | null
  onChange: (url: string | null) => void
  bucket?: string
  className?: string
}

export function ImageUploader({
  value,
  onChange,
  bucket = 'thumbnails',
  className,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadImage = async (file: File) => {
    const supabase = getSupabaseBrowser()
    setIsUploading(true)
    setError(null)

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setError('対応していない画像形式です。JPEG, PNG, WebP, GIFのみ対応しています。')
      setIsUploading(false)
      return
    }

    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setError('ファイルサイズが大きすぎます。5MB以下の画像を選択してください。')
      setIsUploading(false)
      return
    }

    try {
      // Generate unique filename with date path
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()
      const filename = `${year}/${month}/${timestamp}.${ext}`

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, file)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path)

      onChange(urlData.publicUrl)
    } catch (err) {
      console.error('Upload error:', err)
      setError('アップロードに失敗しました。もう一度お試しください。')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadImage(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      uploadImage(file)
    }
  }

  const handleRemove = () => {
    // Just clear the URL - don't delete from Storage
    // Storage cleanup should be done from Media management page
    // where usage check is performed
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className={className}>
      {value ? (
        <div className="relative group">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Upload area */}
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border-decorative hover:border-primary/50',
              isUploading && 'pointer-events-none opacity-50'
            )}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-sm text-text-secondary">アップロード中...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-text-secondary" />
                <p className="text-sm text-text-secondary">
                  クリックまたはドラッグ&ドロップ
                </p>
                <p className="text-xs text-text-secondary">
                  JPEG, PNG, WebP, GIF (最大5MB)
                </p>
              </div>
            )}
          </div>

          {/* Select from library button */}
          <button
            type="button"
            onClick={() => setShowMediaPicker(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-border-decorative rounded-lg text-sm text-text-secondary hover:bg-gray-50 hover:border-primary/50 transition-colors"
          >
            <ImageIcon className="h-4 w-4" />
            ライブラリから選択
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}

      {/* Media Picker Dialog */}
      <MediaPickerDialog
        open={showMediaPicker}
        onOpenChange={setShowMediaPicker}
        onSelect={(url) => {
          setShowMediaPicker(false)
          // Use setTimeout to ensure dialog closes before updating parent state
          setTimeout(() => onChange(url), 0)
        }}
      />
    </div>
  )
}
