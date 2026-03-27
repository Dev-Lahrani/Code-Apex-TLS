"use client"

import { useEffect, useMemo, useState, use } from "react"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { AccessControlPanel } from "@/components/access-control-panel"
import { DocumentEditorPanel } from "@/components/document-editor-panel"
import { AuditLogPanel } from "@/components/audit-log-panel"
import { SecurityPanel } from "@/components/security-panel"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import {
  approveRequest,
  editDocument,
  getDocument,
  getDocuments,
  getLogs,
  getUsers,
  requestAccess as requestAccessApi,
  type ApiAccessRequest,
} from "@/lib/api"
import {
  mapApiDocument,
  mapApiLogs,
  type AuditLogEntry,
  type Document,
  type DocumentStatus,
  type UserDirectory,
} from "@/lib/document-store"
import { Spinner } from "@/components/ui/spinner"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentViewPage({ params }: PageProps) {
const { id } = use(params)
const { user } = useAuth()

const REQUEST_STORAGE_KEY = "zerotrust-active-requests"
const ACCESS_REQUEST_TTL_MS =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ACCESS_REQUEST_TTL_MS
    ? Number(process.env.NEXT_PUBLIC_ACCESS_REQUEST_TTL_MS)
    : 60 * 60 * 1000) || 60 * 60 * 1000

const [directory, setDirectory] = useState<UserDirectory>({})
const [document, setDocument] = useState<Document | null>(null)
const [content, setContent] = useState("")
const [isRequesting, setIsRequesting] = useState(false)
const [isApproving, setIsApproving] = useState<string | null>(null)
const [isLoading, setIsLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [activeRequest, setActiveRequest] = useState<ApiAccessRequest | null>(null)
  const [missing, setMissing] = useState(false)

  const currentUserId = user?.id
  const participantLookup = useMemo(
    () => directory,
    [directory]
  )

  useEffect(() => {
    let cancelled = false
    const loadUsers = async () => {
      try {
        const users = await getUsers()
        if (!cancelled) {
          const mapped = users.reduce<UserDirectory>((acc, item) => {
            acc[item.id] = { name: item.name }
            return acc
          }, {})
          setDirectory(mapped)
        }
      } catch (error) {
        console.error(error)
        toast({
          title: "Unable to load participants",
          description: "User directory could not be fetched.",
          variant: "destructive",
        })
      }
    }
    loadUsers()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    const stored = typeof window !== "undefined" ? localStorage.getItem(REQUEST_STORAGE_KEY) : null
    if (stored) {
      try {
        const parsed: Record<string, ApiAccessRequest> = JSON.parse(stored)
        if (parsed[id]) {
          setActiveRequest(parsed[id])
        }
      } catch {
        // ignore malformed cache
      }
    }
  }, [currentUserId, id])

  useEffect(() => {
    if (!currentUserId) return
    try {
      const existing = typeof window !== "undefined" ? localStorage.getItem(REQUEST_STORAGE_KEY) : null
      const parsed: Record<string, ApiAccessRequest> = existing ? JSON.parse(existing) : {}
      if (activeRequest) {
        parsed[id] = activeRequest
      } else {
        delete parsed[id]
      }
      if (typeof window !== "undefined") {
        localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(parsed))
      }
    } catch {
      // ignore caching issues
    }
  }, [activeRequest, currentUserId, id])

  useEffect(() => {
    if (!currentUserId) return
    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    const load = async (isPoll = false) => {
      try {
        if (!isPoll) {
          setIsLoading(true)
        }

        // Expire local cache proactively
        if (activeRequest?.created_at) {
          const createdAt = new Date(activeRequest.created_at).getTime()
          if (!Number.isNaN(createdAt) && Date.now() - createdAt > ACCESS_REQUEST_TTL_MS) {
            setActiveRequest(null)
            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    status: "locked",
                    currentApprovals: 0,
                    participants: prev.participants.map((p) => ({ ...p, status: "not-requested" as const })),
                  }
                : prev
            )
          }
        }

        const documentsResponse = await getDocuments(currentUserId)
        const target = documentsResponse.data.documents.find((doc) => doc.id === id)
        if (!target) {
          if (!cancelled) {
            setMissing(true)
            setDocument(null)
          }
          return
        } else if (!cancelled) {
          setMissing(false)
        }

          const mapped = mapApiDocument(target, participantLookup, {
            currentApprovals: activeRequest?.status === "approved" ? target?.threshold ?? 0 : 0,
            status: activeRequest?.status === "approved" ? "unlocked" : activeRequest ? "pending" : "locked",
            requestId: activeRequest?.id,
          })
          if (!cancelled) {
            setDocument(mapped)
            setContent((prev) => (prev ? prev : mapped.content))
          }

        if (activeRequest?.status === "approved" && activeRequest.requester_id === currentUserId) {
          const docDetail = await getDocument(target!.id, activeRequest.id, currentUserId)
          if (!cancelled) {
            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    content: docDetail.data.document.content ?? "",
                    status: "unlocked" as DocumentStatus,
                    currentApprovals: prev.requiredApprovals,
                  }
                : mapApiDocument(docDetail.data.document, participantLookup, {
                    content: docDetail.data.document.content ?? "",
                    status: "unlocked",
                    currentApprovals: docDetail.data.document.threshold,
                    requestId: activeRequest.id,
                  })
            )
            setContent(docDetail.data.document.content ?? "")
          }
        }

        const logResponse = await getLogs(id, currentUserId)
        if (!cancelled) {
          const mappedLogs = mapApiLogs(logResponse.data.logs)
          setLogs(mappedLogs)

          if (activeRequest) {
            const approvalLogs = mappedLogs.filter(
              (entry) =>
                entry.details === activeRequest.id &&
                entry.action.toLowerCase().includes("approved")
            )
            const approvedUsers = new Set(
              approvalLogs
                .map((entry) => entry.userId)
                .filter((val): val is string => !!val)
            )
             const approvalsCount = approvedUsers.size
             const thresholdMet =
               activeRequest.status === "approved" ||
               approvalsCount >= mapped.requiredApprovals ||
               mappedLogs.some(
                 (entry) =>
                  entry.details === activeRequest.id &&
                  entry.action.toLowerCase().includes("threshold met")
              )

            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    currentApprovals: thresholdMet
                      ? prev.requiredApprovals
                      : Math.min(approvalsCount, prev.requiredApprovals),
                    status: thresholdMet ? "unlocked" : "pending",
                    participants: prev.participants.map((p) => {
                      if (approvedUsers.has(p.id)) {
                        return { ...p, status: "approved" as const }
                      }
                      if (activeRequest) {
                        return { ...p, status: "pending" as const }
                      }
                      return { ...p, status: "not-requested" as const }
                    }),
                  }
                : prev
            )

            if (thresholdMet && activeRequest.status !== "approved") {
              setActiveRequest({ ...activeRequest, status: "approved" })
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          if (error instanceof Error && error.message.toLowerCase().includes("expired")) {
            setActiveRequest(null)
            setDocument((prev) =>
              prev
                ? {
                    ...prev,
                    status: "locked",
                    currentApprovals: 0,
                    participants: prev.participants.map((p) => ({ ...p, status: "not-requested" as const })),
                  }
                : prev
            )
          }
          toast({
            title: "Unable to load document",
            description: error instanceof Error ? error.message : "Please try again.",
            variant: "destructive",
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    load()
    interval = setInterval(() => load(true), 2500)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [activeRequest, currentUserId, id, participantLookup])

  const handleRequestAccess = async () => {
    if (!document || !currentUserId) return
    setIsRequesting(true)
    try {
      const response = await requestAccessApi(document.id, currentUserId)
      setActiveRequest(response.data.request)
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              status: "pending",
              currentApprovals: 0,
              requestId: response.data.request.id,
              participants: prev.participants.map((p) => ({ ...p, status: "pending" as const })),
            }
          : prev
      )
      toast({
        title: "Access requested",
        description: "Waiting for participant approvals.",
      })
      // Persist created_at for TTL checks
      if (response.data.request.created_at) {
        setActiveRequest(response.data.request)
      }
    } catch (error) {
      toast({
        title: "Request failed",
        description: error instanceof Error ? error.message : "Unable to request access.",
        variant: "destructive",
      })
    } finally {
      setIsRequesting(false)
    }
  }

  const handleApprove = async (participantId: string) => {
    if (!activeRequest) return
    setIsApproving(participantId)

    try {
      const response = await approveRequest(activeRequest.id, participantId)
      setActiveRequest(response.data.request)

      setDocument((prev) =>
        prev
          ? {
              ...prev,
              currentApprovals:
                response.data.request.status === "approved"
                  ? prev.requiredApprovals
                  : Math.min(prev.currentApprovals + 1, prev.requiredApprovals),
              status: response.data.request.status === "approved" ? "unlocked" : "pending",
              participants: prev.participants.map((p) =>
                p.id === participantId ? { ...p, status: "approved" as const } : p
              ),
            }
          : prev
      )

      if (response.data.request.status === "approved") {
        toast({
          title: "Access granted",
          description: "Document has been unlocked.",
        })
      } else {
        toast({
          title: "Approval received",
          description: "Waiting for more approvals.",
        })
      }
    } catch (error) {
      toast({
        title: "Approval failed",
        description: error instanceof Error ? error.message : "Unable to approve request.",
        variant: "destructive",
      })
    } finally {
      setIsApproving(null)
    }
  }

  const handleContentChange = (newContent: string) => {
    setContent(newContent)
    if (document) {
      setDocument({
        ...document,
        content: newContent,
        lastUpdated: new Date(),
      })
    }
  }

  const handleSave = async () => {
    if (!document || !currentUserId || !activeRequest) return
    try {
      const detail = await getDocument(document.id, activeRequest.id, currentUserId)
      await editDocument(document.id, {
        document_id: document.id,
        request_id: activeRequest.id,
        editor_id: currentUserId,
        content,
      })
      setDocument((prev) =>
        prev
          ? {
              ...prev,
              content: content || detail.data.document.content || "",
              lastUpdated: new Date(),
            }
          : prev
      )
      toast({
        title: "Document updated",
        description: "Your changes have been saved.",
      })
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "Unable to save document.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Document">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Spinner className="h-4 w-4" />
          Loading document...
        </div>
      </AppShell>
    )
  }

  if (missing) {
    notFound()
  }

  if (!document) {
    notFound()
  }

  return (
    <AppShell title="Document">
      <div className="space-y-4">
        {/* Security Panel */}
        {document && <SecurityPanel document={document} />}

        {/* 3-Column Layout */}
        {document && (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr_280px]">
            {/* Left Panel - Access Control */}
            <AccessControlPanel
              document={document}
              onRequestAccess={handleRequestAccess}
              onApprove={handleApprove}
              currentUserId={currentUserId || undefined}
              requesterId={activeRequest?.requester_id}
              isRequesting={isRequesting}
              isApproving={isApproving}
            />

            {/* Center Panel - Editor */}
            <DocumentEditorPanel
              document={document}
              content={content}
              onContentChange={handleContentChange}
              onSave={document.status === "unlocked" ? handleSave : undefined}
            />

            {/* Right Panel - Audit Log */}
            <AuditLogPanel entries={logs} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
