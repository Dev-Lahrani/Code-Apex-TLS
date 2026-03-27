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
  thresholdType: "fixed" | "percentage" | "smart"
  thresholdValue?: number | null
}

export type UserDirectory = Record<string, { name: string }>

function computeRequiredApprovals(
  participantsCount: number,
  thresholdType: "fixed" | "percentage" | "smart",
  threshold: number,
  thresholdValue?: number | null
): number {
  const safeParticipants = Math.max(participantsCount, 0)
  let required = threshold

  if (thresholdType === "percentage") {
    if (thresholdValue && thresholdValue > 0 && thresholdValue <= 1) {
      required = Math.ceil(thresholdValue * safeParticipants)
    }
  } else if (thresholdValue && thresholdValue > 0) {
    required = thresholdValue
  }

  if (required < 1) required = 1
  if (safeParticipants > 0) {
    required = Math.min(required, safeParticipants)
  }
  return required
}

export function mapApiDocument(
  apiDoc: import("./api").ApiDocument,
  users: UserDirectory,
  overrides?: Partial<Pick<Document, "currentApprovals" | "status" | "content" | "requestId">>
): Document {
  const requiredApprovals = computeRequiredApprovals(
    apiDoc.participants.length,
    apiDoc.threshold_type as Document["thresholdType"],
    apiDoc.threshold,
    apiDoc.threshold_value ?? undefined
  )
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
    thresholdType: apiDoc.threshold_type as Document["thresholdType"],
    thresholdValue: apiDoc.threshold_value ?? undefined,
  }
}

export function mapApiLogs(entries: import("./api").ApiLogEntry[]): AuditLogEntry[] {
  return [...entries]
    .sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .map((entry) => ({
      id: entry.id,
      action: entry.action,
      timestamp: new Date(entry.timestamp),
      hash: entry.hash ?? "—",
      verified: !!entry.tx_hash || !!entry.hash,
      userId: entry.user_id,
      details: entry.details,
    }))
}
