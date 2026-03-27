"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, FileText } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { DocumentCard } from "@/components/document-card"
import { CreateDocumentModal } from "@/components/create-document-modal"
import { SearchFilter } from "@/components/search-filter"
import { EmptyState } from "@/components/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { getDocuments, getUsers } from "@/lib/api"
import {
  mapApiDocument,
  type Document,
  type DocumentStatus,
  type UserDirectory,
} from "@/lib/document-store"
import { toast } from "@/hooks/use-toast"

export default function DashboardPage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [userDirectory, setUserDirectory] = useState<UserDirectory>({})
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilters, setStatusFilters] = useState<DocumentStatus[]>(["locked", "pending", "unlocked"])

  useEffect(() => {
    let cancelled = false
    const loadUsers = async () => {
      if (!user?.id) return
      try {
        const users = await getUsers()
        if (!cancelled) {
          const mapped = users.reduce<UserDirectory>((acc, item) => {
            acc[item.id] = { name: item.name }
            return acc
          }, {})
          setUserDirectory(mapped)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          toast({
            title: "Unable to load users",
            description: "User directory could not be fetched.",
            variant: "destructive",
          })
        }
      }
    }
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  useEffect(() => {
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    const loadDocuments = async (isPoll = false) => {
      if (!user?.id) return
      try {
        if (isPoll) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        const response = await getDocuments(user.id)
        if (!cancelled) {
          const mapped = response.data.documents.map((doc) => mapApiDocument(doc, userDirectory))
          setDocuments(mapped)
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Unable to load documents",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    if (user?.id) {
      loadDocuments()
      interval = setInterval(() => loadDocuments(true), 2500)
    }

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [user?.id, userDirectory])

  const handleCreateDocument = (newDoc: Document) => {
    setDocuments((prev) => [newDoc, ...prev])
  }

  const handleStatusFilterChange = (status: DocumentStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    )
  }

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilters.includes(doc.status)
      return matchesSearch && matchesStatus
    })
  }, [documents, searchQuery, statusFilters])

  const isEmpty = documents.length === 0
  const noResults = !isEmpty && filteredDocuments.length === 0

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Documents</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Secure, threshold-controlled collaboration
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>

        {/* Search & Filter */}
        {!isEmpty && (
          <SearchFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilters={statusFilters}
            onStatusFilterChange={handleStatusFilterChange}
          />
        )}

        {/* Empty State */}
        {isEmpty && (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create your first secure document to get started with threshold-based access control."
            action={
              <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Create document
              </Button>
            }
          />
        )}

        {/* No Results */}
        {noResults && (
          <EmptyState
            icon={FileText}
            title="No documents found"
            description="Try adjusting your search query or filters."
            action={
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilters(["locked", "pending", "unlocked"])
                }}
              >
                Clear filters
              </Button>
            }
          />
        )}

        {/* Document Grid */}
        {!isEmpty && !noResults && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc, index) => (
              <DocumentCard key={doc.id} document={doc} index={index} />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="h-4 w-4" />
            Loading documents...
          </div>
        )}

        {!isLoading && isRefreshing && (
          <p className="text-xs text-muted-foreground">Updating documents…</p>
        )}
      </div>

      {/* Create Document Modal */}
      <CreateDocumentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onCreateDocument={handleCreateDocument}
        userDirectory={userDirectory}
      />
    </AppShell>
  )
}
