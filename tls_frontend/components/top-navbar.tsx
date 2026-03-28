"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { Bell } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth-context"
import { getDocuments, getLogs, getUsers } from "@/lib/api"

interface NotificationItem {
  id: string
  documentId: string
  message: string
  timestamp: Date
}

interface TopNavbarProps {
  title: string
}

export function TopNavbar({ title }: TopNavbarProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastSeenAt, setLastSeenAt] = useState(0)
  const storageKey = user?.id ? `secure_docs-notifications-last-seen:${user.id}` : null

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return
    const raw = window.localStorage.getItem(storageKey)
    setLastSeenAt(raw ? Number(raw) || 0 : 0)
  }, [storageKey])

  useEffect(() => {
    if (!user?.id) {
      setNotifications([])
      setIsLoading(false)
      return
    }

    let cancelled = false
    let interval: ReturnType<typeof setInterval> | undefined

    const loadNotifications = async (isPoll = false) => {
      try {
        if (!isPoll) setIsLoading(true)
        const [documentsResponse, users] = await Promise.all([getDocuments(user.id), getUsers()])
        const userMap = users.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.name
          return acc
        }, {})

        const logsByDocument = await Promise.all(
          documentsResponse.data.documents.map(async (doc) => {
            const logsResponse = await getLogs(doc.id, user.id)
            return logsResponse.data.logs.map((log) => ({ log, documentId: doc.id, documentTitle: doc.title }))
          })
        )

        const mapped = logsByDocument
          .flat()
          .map(({ log, documentId, documentTitle }) => {
            const action = log.action.toLowerCase()
            const actorName = log.user_id ? userMap[log.user_id] ?? "Someone" : "System"
            let message = `${actorName} ${log.action.toLowerCase()} in ${documentTitle}`

            if (action.includes("requested")) {
              message = `${actorName} requested access to ${documentTitle}`
            } else if (action.includes("approved")) {
              message = `${actorName} approved access for ${documentTitle}`
            } else if (action.includes("threshold met") || action.includes("granted") || action.includes("unlocked")) {
              message = `Access granted for ${documentTitle}`
            } else if (action.includes("edit") || action.includes("updated")) {
              message = `${actorName} edited ${documentTitle}`
            } else if (action.includes("created")) {
              message = `${actorName} created ${documentTitle}`
            }

            return {
              id: log.id,
              documentId,
              message,
              timestamp: new Date(log.timestamp),
            }
          })
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 20)

        if (!cancelled) {
          setNotifications(mapped)
        }
      } catch {
        if (!cancelled) {
          setNotifications([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadNotifications()
    interval = setInterval(() => loadNotifications(true), 10000)

    return () => {
      cancelled = true
      if (interval) clearInterval(interval)
    }
  }, [user?.id])

  const unreadCount = useMemo(
    () => notifications.filter((item) => item.timestamp.getTime() > lastSeenAt).length,
    [notifications, lastSeenAt]
  )

  const handleOpenChange = (open: boolean) => {
    if (!open || !storageKey || typeof window === "undefined") return
    const seenAt = Date.now()
    window.localStorage.setItem(storageKey, String(seenAt))
    setLastSeenAt(seenAt)
  }

  const handleMarkAllAsRead = () => {
    if (!storageKey || typeof window === "undefined") return
    const newestTs = notifications[0]?.timestamp.getTime() ?? Date.now()
    window.localStorage.setItem(storageKey, String(newestTs))
    setLastSeenAt(newestTs)
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <DropdownMenu onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <>
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
                    {Math.min(unreadCount, 9)}
                  </span>
                </>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-96 max-h-[420px] overflow-auto">
            <DropdownMenuLabel className="flex items-center justify-between gap-2">
              <span>Notifications</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </Button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoading ? (
              <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-4 text-sm text-muted-foreground">No notifications yet.</div>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="cursor-pointer items-start py-2"
                  onClick={() => router.push(`/documents/${item.documentId}`)}
                >
                  <div className="space-y-1">
                    <p className="text-sm leading-tight">{item.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <UserMenu />
      </div>
    </header>
  )
}
