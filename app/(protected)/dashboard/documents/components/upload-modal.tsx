'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DragDropZone } from './drag-drop-zone'
import { UploadFile, uploadFile, formatFileSize } from '../lib/upload-utils'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

interface UploadModalProps {
  onUploadComplete: (files: any[]) => void
}

export function UploadModal({ onUploadComplete }: UploadModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [folder, setFolder] = useState('/')

  const handleFilesDrop = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      ...file,
      id: uuidv4(),
      progress: 0,
      status: 'pending'
    }))
    setFiles(prev => [...prev, ...uploadFiles])
  }

  const handleUpload = async () => {
    const uploads = files.map(async file => {
      try {
        setFiles(prev => 
          prev.map(f => 
            f.id === file.id ? { ...f, status: 'uploading' } : f
          )
        )

        await uploadFile(file, (progress) => {
          setFiles(prev =>
            prev.map(f =>
              f.id === file.id ? { ...f, progress } : f
            )
          )
        })

        setFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, status: 'success' } : f
          )
        )
      } catch (error) {
        setFiles(prev =>
          prev.map(f =>
            f.id === file.id ? { ...f, status: 'error', error: 'Upload failed' } : f
          )
        )
      }
    })

    await Promise.all(uploads)
    onUploadComplete(files)
    setTimeout(() => {
      setIsOpen(false)
      setFiles([])
    }, 1000)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Upload Files</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Select value={folder} onValueChange={setFolder}>
            <SelectTrigger>
              <SelectValue placeholder="Select folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="/">Root</SelectItem>
              <SelectItem value="/technical">Technical</SelectItem>
              <SelectItem value="/legal">Legal</SelectItem>
              <SelectItem value="/financial">Financial</SelectItem>
            </SelectContent>
          </Select>

          <DragDropZone onFilesDrop={handleFilesDrop} />

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <div className="ml-4">
                    {file.status === 'uploading' && (
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                        <span className="ml-2 text-sm text-gray-500">
                          {file.progress}%
                        </span>
                      </div>
                    )}
                    {file.status === 'success' && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={files.length === 0}
            >
              Upload {files.length > 0 && `(${files.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 