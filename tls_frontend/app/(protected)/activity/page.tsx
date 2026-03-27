"use client"

import { formatDistanceToNow } from "date-fns"
import { CheckCircle2, FileText, Lock, Unlock, UserPlus } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Activity data - to be populated from backend API
const activities: Array<{
  id: string
  type: string
  icon: typeof CheckCircle2
  user: { name: string; avatar: string; initials: string }
  action: string
  document: string
  timestamp: Date
  hash: string
}> = []

export default function ActivityPage() {
  return (
    <AppShell title="Activity">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Activity Feed</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track all document access and approval events
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {activities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <div
                    key={activity.id}
                    className="relative pl-8 pb-6 last:pb-0"
                  >
                    {/* Timeline line */}
                    {index < activities.length - 1 && (
                      <div className="absolute left-[15px] top-8 h-full w-px bg-border" />
                    )}
                    {/* Timeline icon */}
                    <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background">
                      <Icon className="h-4 w-4 text-muted-foreground" />
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
                          <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-success/10 text-success border-success/20">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Verified
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
