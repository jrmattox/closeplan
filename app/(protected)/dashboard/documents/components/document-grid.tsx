'use client'

import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Document } from "@/lib/test-data"
import { formatDistanceToNow } from "date-fns"
import { FileText, FileCode, FileImage, File, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DocumentGridProps {
  documents: Document[]
  onSelect?: (doc: Document) => void
}

const getDocumentIcon = (type: Document['type']) => {
  switch (type) {
    case 'PDF':
      return <FileText className="h-12 w-12 text-red-500" />
    case 'DOC':
      return <FileText className="h-12 w-12 text-blue-500" />
    case 'SHEET':
      return <FileCode className="h-12 w-12 text-green-500" />
    case 'SLIDE':
      return <FileImage className="h-12 w-12 text-yellow-500" />
    default:
      return <File className="h-12 w-12 text-gray-500" />
  }
}

const formatFileSize = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

export function DocumentGrid({ documents, onSelect }: DocumentGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((doc) => (
        <Card
          key={doc.id}
          className="group hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onSelect?.(doc)}
        >
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              {getDocumentIcon(doc.type)}
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-5 w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Download</DropdownMenuItem>
                  <DropdownMenuItem>Share</DropdownMenuItem>
                  <DropdownMenuItem>Move</DropdownMenuItem>
                  <DropdownMenuItem className="text-red-600">
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <h3 className="mt-4 font-medium truncate">{doc.name}</h3>
          </CardContent>
          <CardFooter className="text-sm text-muted-foreground">
            <div className="w-full flex justify-between items-center">
              <span>v{doc.version}</span>
              <span>{formatFileSize(doc.size)}</span>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
} 