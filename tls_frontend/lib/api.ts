const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api"

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      ...init,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const message = data?.detail || data?.message || "Request failed"
      throw new Error(typeof message === "string" ? message : "Request failed")
    }

    return data as T
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error("Request failed")
  }
}

export interface ApiDocument {
  id: string
  title: string
  owner_id: string
  threshold: number
  threshold_type: string
  threshold_value?: number | null
  participants: string[]
  created_at: string
  content?: string | null
}

export interface ApiLogEntry {
  id: string
  action: string
  user_id?: string | null
  timestamp: string
  hash?: string
  tx_hash?: string | null
  details?: string | null
}

export interface ApiAccessRequest {
  id: string
  document_id: string
  requester_id: string
  status: "pending" | "approved" | "denied"
  created_at: string
}

export interface ApiUser {
  id: string
  name: string
}

export interface CreateDocumentPayload {
  title: string
  owner_id: string
  participants: string[]
  threshold: number
  threshold_type?: "fixed" | "percentage" | "smart"
  threshold_value?: number | null
  content?: string
}

export interface EditDocumentPayload {
  document_id: string
  request_id: string
  editor_id: string
  content: string
}

export async function getDocuments(userId: string) {
  return apiFetch<{ data: { documents: ApiDocument[] } }>(`/documents?user_id=${userId}`)
}

export async function getDocument(documentId: string, requestId: string, requesterId: string) {
  const search = new URLSearchParams({
    request_id: requestId,
    requester_id: requesterId,
  })
  return apiFetch<{ data: { document: ApiDocument } }>(`/documents/${documentId}?${search.toString()}`)
}

export async function createDocument(payload: CreateDocumentPayload) {
  return apiFetch<{ data: { document: ApiDocument } }>(`/documents`, {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      threshold_type: payload.threshold_type ?? "fixed",
      content: payload.content ?? "",
    }),
  })
}

export async function requestAccess(documentId: string, requesterId: string) {
  return apiFetch<{ data: { request: ApiAccessRequest } }>(`/documents/${documentId}/request-access`, {
    method: "POST",
    body: JSON.stringify({ requester_id: requesterId }),
  })
}

export async function approveRequest(requestId: string, approverId: string) {
  return apiFetch<{ data: { request: ApiAccessRequest } }>(`/requests/${requestId}/approve`, {
    method: "POST",
    body: JSON.stringify({ approver_id: approverId }),
  })
}

export async function editDocument(documentId: string, payload: EditDocumentPayload) {
  return apiFetch<{ data: { document: ApiDocument } }>(`/documents/${documentId}/edit`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function getLogs(documentId: string, userId: string) {
  return apiFetch<{ data: { logs: ApiLogEntry[] } }>(`/documents/${documentId}/logs?user_id=${userId}`)
}

export async function getUsers() {
  return apiFetch<ApiUser[]>(`/users`)
}

export async function createUser(name: string) {
  return apiFetch<ApiUser>(`/users`, {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export { API_BASE_URL }
