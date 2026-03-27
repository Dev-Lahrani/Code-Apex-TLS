export type DocumentStatus = "locked" | "pending" | "unlocked"

export type ParticipantStatus = "approved" | "pending" | "not-requested"

export interface Participant {
  id: string
  name: string
  email: string
  avatar?: string
  status: ParticipantStatus
}

export interface AuditLogEntry {
  id: string
  action: string
  timestamp: Date
  hash?: string
  verified?: boolean
  userId?: string | null
  details?: string | null
}

export interface Document {
  id: string
  title: string
  content: string
  status: DocumentStatus
  threshold: number
  requiredApprovals: number
  currentApprovals: number
  participants: Participant[]
  auditLog: AuditLogEntry[]
  lastUpdated: Date
  requestId?: string
}

export type UserDirectory = Record<string, { name: string }>

export function mapApiDocument(
  apiDoc: import("./api").ApiDocument,
  users: UserDirectory,
  overrides?: Partial<Pick<Document, "currentApprovals" | "status" | "content" | "requestId">>
): Document {
  const requiredApprovals = apiDoc.threshold_value ?? apiDoc.threshold
  const currentApprovals = overrides?.currentApprovals ?? 0
  const status: DocumentStatus =
    overrides?.status ??
    (currentApprovals >= requiredApprovals
      ? "unlocked"
      : currentApprovals > 0
        ? "pending"
        : "locked")

  return {
    id: apiDoc.id,
    title: apiDoc.title,
    content: overrides?.content ?? apiDoc.content ?? "",
    status,
    threshold: apiDoc.threshold,
    requiredApprovals,
    currentApprovals,
    participants: apiDoc.participants.map((participantId) => ({
      id: participantId,
      name: users[participantId]?.name ?? "Participant",
      email: "",
      status: "not-requested",
    })),
    auditLog: [],
    lastUpdated: new Date(apiDoc.created_at),
    requestId: overrides?.requestId,
  }
}

export function mapApiLogs(entries: import("./api").ApiLogEntry[]): AuditLogEntry[] {
  return entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    timestamp: new Date(entry.timestamp),
    hash: entry.hash,
    verified: !!entry.tx_hash || !!entry.hash,
    userId: entry.user_id,
    details: entry.details,
  }))
}
