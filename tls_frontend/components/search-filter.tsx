"use client"

import { Search, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { DocumentStatus } from "@/lib/document-store"

interface SearchFilterProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  statusFilters: DocumentStatus[]
  onStatusFilterChange: (status: DocumentStatus) => void
}

export function SearchFilter({
  searchQuery,
  onSearchChange,
  statusFilters,
  onStatusFilterChange,
}: SearchFilterProps) {
  const hasActiveFilters = statusFilters.length < 3

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary" />
            )}
            <span className="sr-only">Filter</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={statusFilters.includes("locked")}
            onCheckedChange={() => onStatusFilterChange("locked")}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive" />
              Locked
            </span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusFilters.includes("pending")}
            onCheckedChange={() => onStatusFilterChange("pending")}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-warning" />
              Pending
            </span>
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={statusFilters.includes("unlocked")}
            onCheckedChange={() => onStatusFilterChange("unlocked")}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success" />
              Unlocked
            </span>
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
