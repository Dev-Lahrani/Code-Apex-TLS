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
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Audit Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-0 px-4 pb-4">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className="relative pl-4 pb-4 last:pb-0"
              >
                {/* Timeline line */}
                {index < entries.length - 1 && (
                  <div className="absolute left-[7px] top-3 h-full w-px bg-border" />
                )}
                {/* Timeline dot */}
                <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-border bg-background" />
                
                <div className="space-y-1">
                  <p className="text-sm text-foreground leading-tight">{entry.action}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                    </span>
                    <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {entry.hash}
                    </code>
                    {entry.verified && (
                      <Badge variant="outline" className="gap-1 text-[10px] h-5 bg-success/10 text-success border-success/20">
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
