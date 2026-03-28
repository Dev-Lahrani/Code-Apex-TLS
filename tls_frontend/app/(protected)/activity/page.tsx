"use client"

import { useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, FileText, Lock, Unlock, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import { AppShell } from "@/components/app-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { getDocuments, getLogs, getUsers } from "@/lib/api"

type ActivityItem = {
  id: string
  type: string
  icon: typeof CheckCircle2
  user: { name: string; avatar: string; initials: string }
  action: string
  document: string
  timestamp: Date
  hash: string
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function getActivityMeta(action: string): Pick<ActivityItem, "icon" | "type"> {
  const normalizedAction = action.toLowerCase()

  if (normalizedAction.includes("approved")) {
    return { icon: CheckCircle2, type: "approved" }
  }
  if (normalizedAction.includes("requested")) {
    return { icon: Lock, type: "requested" }
  }
  if (normalizedAction.includes("created")) {
    return { icon: FileText, type: "created" }
  }
  if (normalizedAction.includes("granted") || normalizedAction.includes("unlocked")) {
    return { icon: Unlock, type: "granted" }
  }
  return { icon: UserPlus, type: "activity" }
}

export default function ActivityPage() {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "approved" | "requested" | "other">("all")

  useEffect(() => {
    let cancelled = false

    const loadActivities = async () => {
      if (!user?.id) {
        if (!cancelled) {
          setActivities([])
          setIsLoading(false)
        }
        return
      }

      try {
        setIsLoading(true)

        const currentUserId = user.id
        const [documentsResponse, users] = await Promise.all([getDocuments(currentUserId), getUsers()])
        const documents = documentsResponse.data.documents
        const userMap = users.reduce<Record<string, string>>((acc, item) => {
          acc[item.id] = item.name
          return acc
        }, {})

        const logsPerDocument = await Promise.all(
          documents.map(async (document) => {
            const logsResponse = await getLogs(document.id, currentUserId)
            return logsResponse.data.logs.map((log) => ({ log, documentTitle: document.title }))
          })
        )

        const merged = logsPerDocument
          .flat()
          .sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime())
          .map(({ log, documentTitle }) => {
            const actorName = log.user_id ? userMap[log.user_id] ?? "System" : "System"
            const meta = getActivityMeta(log.action)

            return {
              id: log.id,
              action: log.action,
              document: documentTitle,
              timestamp: new Date(log.timestamp),
              hash: log.hash ? `${log.hash.slice(0, 12)}...` : "N/A",
              user: {
                name: actorName,
                avatar: "",
                initials: getInitials(actorName),
              },
              icon: meta.icon,
              type: meta.type,
            }
          })

        if (!cancelled) {
          setActivities(merged)
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error)
          setActivities([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadActivities()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const totalEvents = activities.length
  const approvals = activities.filter((a) => a.type === "approved").length
  const accessRequests = activities.filter((a) => a.type === "requested").length
  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true
    if (filter === "other") return !["approved", "requested"].includes(activity.type)
    return activity.type === filter
  })
  const getTone = (type: string) => {
    if (type === "approved") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
    if (type === "requested") return "border-sky-500/30 bg-sky-500/10 text-sky-600"
    if (type === "created") return "border-amber-500/30 bg-amber-500/10 text-amber-600"
    return "border-border bg-muted text-muted-foreground"
  }

  return (
    <AppShell title="Activity">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Activity Feed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track all document access and approval events
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="ring-1 ring-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total Events</p>
              <p className="mt-2 text-2xl font-semibold">{totalEvents}</p>
            </CardContent>
          </Card>
          <Card className="ring-1 ring-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Approvals</p>
              <p className="mt-2 text-2xl font-semibold">{approvals}</p>
            </CardContent>
          </Card>
          <Card className="ring-1 ring-border">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Access Requests</p>
              <p className="mt-2 text-2xl font-semibold">{accessRequests}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
          <Button size="sm" variant={filter === "approved" ? "default" : "outline"} onClick={() => setFilter("approved")}>Approvals</Button>
          <Button size="sm" variant={filter === "requested" ? "default" : "outline"} onClick={() => setFilter("requested")}>Requests</Button>
          <Button size="sm" variant={filter === "other" ? "default" : "outline"} onClick={() => setFilter("other")}>Other</Button>
        </div>

        <Card className="ring-1 ring-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="h-4 w-4" />
                </div>
              ) : filteredActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                filteredActivities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div
                    key={activity.id}
                    className="relative pl-8 pb-6 last:pb-0"
                  >
                    {/* Timeline line */}
                    {index < filteredActivities.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                    )}
                    {/* Timeline icon */}
                    <div className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border ${getTone(activity.type)}`}>
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-[8px]">
                              {activity.user.initials}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-sm">
                            <span className="font-medium">{activity.user.name}</span>
                            {" "}
                            <span className="text-muted-foreground">{activity.action}</span>
                            {" "}
                            <span className="font-medium">{activity.document}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                          </span>
                          <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {activity.hash}
                          </code>
                          <Badge variant="outline" className={`gap-1 text-[10px] h-5 rounded-md ${getTone(activity.type)}`}>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Verified
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AppShell>
  )
}
