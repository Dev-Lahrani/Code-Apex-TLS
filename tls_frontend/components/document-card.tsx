"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { Lock, Unlock, Clock } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Document, DocumentStatus } from "@/lib/document-store"

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

interface DocumentCardProps {
  document: Document
  index?: number
}

export function DocumentCard({ document, index = 0 }: DocumentCardProps) {
  const status = statusConfig[document.status]
  const StatusIcon = status.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
    >
      <Card className="flex flex-col transition-all duration-150 hover:bg-accent/50 hover:shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium leading-tight">
              {document.title}
            </CardTitle>
            <Badge variant="outline" className={cn("shrink-0 gap-1", status.className)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          <p className="text-sm text-muted-foreground">
            {document.currentApprovals} of {document.requiredApprovals} approvals required
          </p>
          <div className="mt-3 flex items-center gap-1">
            {document.participants.slice(0, 4).map((participant, idx) => (
              <Avatar key={participant.id} className={cn("h-6 w-6 border-2 border-background", idx > 0 && "-ml-2")}>
                <AvatarImage src={participant.avatar} alt={participant.name} />
                <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                  {participant.name.split(" ").map(n => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            ))}
            {document.participants.length > 4 && (
              <span className="ml-1 text-xs text-muted-foreground">
                +{document.participants.length - 4}
              </span>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Updated {formatDistanceToNow(document.lastUpdated, { addSuffix: true })}
          </span>
          <Button asChild size="sm" variant="secondary">
            <Link href={`/documents/${document.id}`}>Open</Link>
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
