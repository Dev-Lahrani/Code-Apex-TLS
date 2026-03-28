"use client"

import { formatDistanceToNow } from "date-fns"
import { CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AuditLogEntry } from "@/lib/document-store"

interface AuditLogPanelProps {
  entries: AuditLogEntry[]
}

export function AuditLogPanel({ entries }: AuditLogPanelProps) {
  const hasEntries = entries.length > 0
  const getEntryTone = (action: string) => {
    const normalized = action.toLowerCase()
    if (normalized.includes("approve") || normalized.includes("grant") || normalized.includes("unlock")) {
      return "border-l-emerald-500 bg-emerald-500/5"
    }
    if (normalized.includes("request")) {
      return "border-l-sky-500 bg-sky-500/5"
    }
    if (normalized.includes("edit") || normalized.includes("update")) {
      return "border-l-amber-500 bg-amber-500/5"
    }
    if (normalized.includes("deny") || normalized.includes("expire")) {
      return "border-l-destructive bg-destructive/5"
    }
    return "border-l-border bg-muted/30"
  }

  return (
    <Card className="h-fit ring-1 ring-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Audit Log</span>
          <Badge variant="outline" className="rounded-md text-[10px] h-5">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-0 px-4 pb-4">
            {!hasEntries && (
              <div className="py-6 text-sm text-muted-foreground text-center">
                No activity yet.
              </div>
            )}
            {entries.map((entry, index) => (
              <div key={entry.id} className="relative pl-4 pb-4 last:pb-0">
                {index < entries.length - 1 && (
                  <div className="absolute left-[7px] top-3 h-full w-px bg-border" />
                )}
                <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
                
                <div className={`space-y-1 rounded-md border-l-2 px-3 py-2 ${getEntryTone(entry.action)}`}>
                  <p className="text-sm text-foreground leading-tight">{entry.action}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                    </span>
                    <code className="text-[11px] font-mono text-muted-foreground bg-background/80 border border-border px-2 py-0.5 rounded-md">
                      {(entry.hash ?? "—").slice(0, 12)}...
                    </code>
                    {entry.verified && (
                      <Badge variant="outline" className="gap-1 text-[10px] h-5 rounded-md bg-success/10 text-success border-success/20">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
