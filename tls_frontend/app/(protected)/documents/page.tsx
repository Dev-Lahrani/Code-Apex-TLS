"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Lock, Unlock, Clock, MoreHorizontal, FileText, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { AppShell } from "@/components/app-shell"
import { SearchFilter } from "@/components/search-filter"
import { EmptyState } from "@/components/empty-state"
import { CreateDocumentModal } from "@/components/create-document-modal"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getDocuments, getUsers } from "@/lib/api"
import {
  mapApiDocument,
  type Document,
  type DocumentStatus,
  type UserDirectory,
} from "@/lib/document-store"
import { useAuth } from "@/lib/auth-context"

const statusConfig: Record<DocumentStatus, { label: string; icon: typeof Lock; className: string }> = {
  locked: {
    label: "Locked",
    icon: Lock,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "bg-warning/10 text-warning-foreground border-warning/20",
  },
  unlocked: {
    label: "Unlocked",
    icon: Unlock,
    className: "bg-success/10 text-success border-success/20",
  },
}

export default function DocumentsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [userDirectory, setUserDirectory] = useState<UserDirectory>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
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
          setDocuments(response.data.documents.map((doc) => mapApiDocument(doc, userDirectory)))
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

  const handleCopyLink = async (docId: string) => {
    const link = `${window.location.origin}/documents/${docId}`
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const input = document.createElement("textarea")
        input.value = link
        input.style.position = "fixed"
        input.style.left = "-9999px"
        document.body.appendChild(input)
        input.focus()
        input.select()
        const copied = document.execCommand("copy")
        document.body.removeChild(input)
        if (!copied) {
          throw new Error("Copy command failed")
        }
      }
      toast({
        title: "Link copied",
        description: "Document link has been copied to clipboard.",
      })
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy link. Please copy it from the browser address bar.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUnavailable = () => {
    toast({
      title: "Delete unavailable",
      description: "Document delete is not available yet.",
    })
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
    <AppShell title="Documents">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">All Documents</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage all your secure documents
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

        {/* Documents Table */}
        {!isEmpty && !noResults && (
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[300px]">Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => {
                  const status = statusConfig[doc.status]
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <Link
                          href={`/documents/${doc.id}`}
                          className="font-medium hover:underline"
                        >
                          {doc.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", status.className)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.currentApprovals}/{doc.requiredApprovals}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {doc.participants.slice(0, 3).map((participant, idx) => (
                            <Avatar
                              key={participant.id}
                              className={cn("h-6 w-6 border-2 border-background", idx > 0 && "-ml-2")}
                            >
                              <AvatarImage src={participant.avatar} alt={participant.name} />
                              <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                                {participant.name.split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {doc.participants.length > 3 && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              +{doc.participants.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(doc.lastUpdated, { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}`)}>
                              View document
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyLink(doc.id)}>
                              Copy link
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={handleDeleteUnavailable}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
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
