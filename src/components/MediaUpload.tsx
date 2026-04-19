'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, Film, Image as ImageIcon } from 'lucide-react'
import { cn, validateFileUpload } from '@/lib/utils'

type Props = {
  onFileSelect: (file: File | null) => void
  allowVideo?: boolean
  maxSizeMB?: number
  label?: string
  preview?: string | null
}

export function MediaUpload({ onFileSelect, allowVideo = false, maxSizeMB = 10, label, preview }: Props) {
  const [localPreview, setLocalPreview] = useState<string | null>(preview ?? null)
  const [isVideo, setIsVideo] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    const { valid, error: err } = validateFileUpload(file, { maxSizeMB, allowVideo })
    if (!valid) {
      setError(err)
      return
    }
    setError(null)
    setIsVideo(file.type.startsWith('video/'))
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    onFileSelect(file)
  }, [onFileSelect, maxSizeMB, allowVideo])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowVideo
      ? { 'image/*': [], 'video/*': [] }
      : { 'image/*': [] },
    maxFiles: 1,
  })

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalPreview(null)
    onFileSelect(null)
    setError(null)
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>}
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all duration-200 text-center',
          isDragActive
            ? 'border-brand-500 bg-brand-500/5'
            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30',
          localPreview && 'p-0 border-solid border-gray-700'
        )}
      >
        <input {...getInputProps()} />

        {localPreview ? (
          <div className="relative rounded-xl overflow-hidden">
            {isVideo ? (
              <video src={localPreview} className="w-full max-h-64 object-cover" controls />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={localPreview} alt="Preview" className="w-full max-h-64 object-cover" />
            )}
            <button
              onClick={clear}
              className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black rounded-full text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex gap-2 text-gray-600">
              <ImageIcon className="w-6 h-6" />
              {allowVideo && <Film className="w-6 h-6" />}
            </div>
            <div>
              <p className="text-sm text-gray-400">
                <span className="text-brand-400 font-medium">Click to upload</span> or drag & drop
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {allowVideo ? 'Images and videos' : 'Images only'} — max {maxSizeMB}MB
              </p>
            </div>
            <div className="p-3 bg-gray-800 rounded-full">
              <Upload className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
    </div>
  )
}
