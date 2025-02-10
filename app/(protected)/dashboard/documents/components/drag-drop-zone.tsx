'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { validateFile } from '../lib/upload-utils'

interface DragDropZoneProps {
  onFilesDrop: (files: File[]) => void
  className?: string
}

export function DragDropZone({ onFilesDrop, className }: DragDropZoneProps) {
  const [error, setError] = useState<string>()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(undefined)
    const validFiles: File[] = []
    
    for (const file of acceptedFiles) {
      const validation = validateFile(file)
      if (!validation.valid) {
        setError(validation.error)
        return
      }
      validFiles.push(file)
    }
    
    onFilesDrop(validFiles)
  }, [onFilesDrop])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  })

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer",
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Upload className={cn(
          "h-10 w-10",
          isDragActive ? "text-blue-500" : "text-gray-400"
        )} />
        {isDragActive ? (
          <p className="text-blue-500">Drop files here...</p>
        ) : (
          <div>
            <p className="text-gray-600">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: PDF, Word, Excel, PowerPoint
            </p>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  )
} 