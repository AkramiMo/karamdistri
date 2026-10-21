'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'

interface ExportDropdownProps {
  totalCount: number
  selectedCount: number
  onExportAll: () => Promise<void>
  onExportSelected: () => Promise<void>
  disabled?: boolean
}

export function ExportDropdown({
  totalCount,
  selectedCount,
  onExportAll,
  onExportSelected,
  disabled = false,
}: ExportDropdownProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExportAll = async () => {
    setIsExporting(true)
    try {
      await onExportAll()
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSelected = async () => {
    setIsExporting(true)
    try {
      await onExportSelected()
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          disabled={disabled || isExporting || totalCount === 0}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export Excel
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={handleExportAll}
          disabled={totalCount === 0}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter tout ({totalCount})
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleExportSelected}
          disabled={selectedCount === 0}
          className="gap-2"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exporter sélection ({selectedCount})
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
