"use client"

import { useEffect, useMemo, useState } from "react"
import { Plus, FileText, Shield, Clock3, Files } from "lucide-react"
import { motion } from "framer-motion"
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
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"
  const totalDocuments = documents.length
  const pendingDocuments = documents.filter((doc) => doc.status === "pending").length
  const securedDocuments = documents.filter((doc) => doc.status === "locked" || doc.status === "unlocked").length

  return (
    <AppShell title="Dashboard">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {greeting}, {user?.name?.split(" ")[0] || "there"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your threshold-controlled secure documents
            </p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="gap-2 w-full sm:w-auto bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-400 hover:to-cyan-400 transition-all duration-150"
          >
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border ring-1 ring-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total Documents</p>
              <Files className="h-4 w-4 text-sky-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">{totalDocuments}</p>
          </div>
          <div className="rounded-lg border border-border ring-1 ring-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Awaiting Approval</p>
              <Clock3 className="h-4 w-4 text-amber-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">{pendingDocuments}</p>
          </div>
          <div className="rounded-lg border border-border ring-1 ring-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Access Granted</p>
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-foreground">{securedDocuments}</p>
          </div>
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
          <div className="rounded-xl border border-border ring-1 ring-border bg-card p-8">
            <div className="mx-auto max-w-xl text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/10">
                <FileText className="h-7 w-7 text-sky-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">No secured documents yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first document to start threshold-approved collaboration, encrypted at rest and auditable by design.
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-400 hover:to-cyan-400 transition-all duration-150"
              >
                <Plus className="h-4 w-4" />
                Create first secure document
              </Button>
            </div>
          </div>
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
      </motion.div>

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
