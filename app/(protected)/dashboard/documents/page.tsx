import { Suspense } from 'react'
import { Button } from "@/components/ui/button"
import { Upload, Grid, List } from "lucide-react"
import { DocumentFilters } from './components/document-filters'
import { DocumentGrid } from './components/document-grid'
import { mockDocuments } from '@/lib/test-data'
import { UploadModal } from './components/upload-modal'

export default function DocumentsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and organize your deal documents
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <List className="mr-2 h-4 w-4" />
            List
          </Button>
          <Button variant="outline">
            <Grid className="mr-2 h-4 w-4" />
            Grid
          </Button>
          <UploadModal 
            onUploadComplete={(files) => {
              console.log('Upload complete:', files)
              // Update document list
            }}
          />
        </div>
      </div>

      <DocumentFilters 
        onFilterChange={(filters) => {
          console.log('Filters changed:', filters)
        }}
      />

      <div className="bg-white rounded-md shadow">
        <div className="p-6">
          <Suspense fallback={<div>Loading documents...</div>}>
            <DocumentGrid documents={mockDocuments} />
          </Suspense>
        </div>
      </div>
    </div>
  )
} 