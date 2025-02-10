'use client'

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Search, Filter } from "lucide-react"
import { useState } from "react"

const DOC_TYPES = [
  'Contract',
  'SOW',
  'Security Assessment',
  'Technical Spec',
  'Legal',
  'Other'
]

const DOC_STATUS = [
  'Draft',
  'In Review',
  'Approved',
  'Archived'
]

interface DocumentFiltersProps {
  onFilterChange: (filters: any) => void
}

export function DocumentFilters({ onFilterChange }: DocumentFiltersProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const handleTypeChange = (type: string) => {
    const updated = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type]
    setSelectedTypes(updated)
    onFilterChange({ ...filters, types: updated })
  }

  const handleStatusChange = (status: string) => {
    const updated = selectedStatus.includes(status)
      ? selectedStatus.filter(s => s !== status)
      : [...selectedStatus, status]
    setSelectedStatus(updated)
    onFilterChange({ ...filters, status: updated })
  }

  const filters = {
    types: selectedTypes,
    status: selectedStatus,
    search: searchQuery
  }

  return (
    <div className="flex gap-4 items-center">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            onFilterChange({ ...filters, search: e.target.value })
          }}
        />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="ml-auto">
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <div className="p-2">
            <div className="font-medium mb-2">Document Type</div>
            {DOC_TYPES.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => handleTypeChange(type)}
              >
                {type}
              </DropdownMenuCheckboxItem>
            ))}
            <div className="font-medium mb-2 mt-4">Status</div>
            {DOC_STATUS.map((status) => (
              <DropdownMenuCheckboxItem
                key={status}
                checked={selectedStatus.includes(status)}
                onCheckedChange={() => handleStatusChange(status)}
              >
                {status}
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 