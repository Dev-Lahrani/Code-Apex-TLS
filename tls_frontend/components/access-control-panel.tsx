"use client"

import { CheckCircle2, Clock, Circle, Copy, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { toast } from "@/hooks/use-toast"
import type { Document, ParticipantStatus } from "@/lib/document-store"

const statusConfig: Record<ParticipantStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  approved: {
    icon: CheckCircle2,
    className: "text-success",
    label: "Approved",
  },
  pending: {
    icon: Clock,
    className: "text-warning-foreground",
    label: "Pending",
  },
  "not-requested": {
    icon: Circle,
    className: "text-muted-foreground",
    label: "Not requested",
  },
}

interface AccessControlPanelProps {
  document: Document
  onRequestAccess: () => void
  onApprove: (participantId: string) => void
  currentUserId?: string
  requesterId?: string
  isRequesting?: boolean
  isApproving?: string | null
}

export function AccessControlPanel({
  document,
  onRequestAccess,
  onApprove,
  currentUserId,
  requesterId,
  isRequesting = false,
  isApproving = null,
}: AccessControlPanelProps) {
  const progress = (document.currentApprovals / document.requiredApprovals) * 100
  const remainingApprovals = document.requiredApprovals - document.currentApprovals
  const isUnlocked = document.status === "unlocked"
  const handleCopyRequestId = async () => {
    if (!document.requestId) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(document.requestId)
      } else {
        const input = window.document.createElement("textarea")
        input.value = document.requestId
        input.style.position = "fixed"
        input.style.left = "-9999px"
        window.document.body.appendChild(input)
        input.focus()
        input.select()
        const copied = window.document.execCommand("copy")
        window.document.body.removeChild(input)
        if (!copied) throw new Error("copy failed")
      }
      toast({ title: "Request ID copied", description: "Request ID copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy request ID.", variant: "destructive" })
    }
  }

  return (
    <Card className="h-fit ring-1 ring-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          Access Control
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-all duration-150">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Threshold approval requires multiple participant confirmations.</TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Participants List */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Participants</p>
          <div className="space-y-2">
            {document.participants.map((participant) => {
              const status = statusConfig[participant.status]
              const StatusIcon = status.icon
              const canApprove =
                participant.id === currentUserId &&
                participant.status === "pending" &&
                participant.id !== requesterId
              const isApprovingThis = isApproving === participant.id

              return (
                <div
                  key={participant.id}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border border-border p-2 transition-all duration-150",
                    participant.id === requesterId ? "bg-sky-500/10 border-sky-500/20" : "bg-card/60"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={participant.avatar} alt={participant.name} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-[10px]">
                        {participant.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{participant.name}</p>
                      <div className="flex items-center gap-1">
                        <StatusIcon className={cn("h-3 w-3", status.className)} />
                        <span className="text-xs text-muted-foreground">{status.label}</span>
                      </div>
                    </div>
                  </div>
                  {canApprove && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onApprove(participant.id)}
                      disabled={isApprovingThis}
                    >
                      {isApprovingThis ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        "Approve"
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Approval Progress */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval Progress</p>
            <div className="flex items-center gap-2">
              {document.requestId && (
                <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={handleCopyRequestId}>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy Request ID
                </Button>
              )}
              <span className="text-sm font-medium">
                {document.currentApprovals}/{document.requiredApprovals}
              </span>
            </div>
          </div>
          <div className={cn(document.status === "pending" && "animate-pulse")}>
            <Progress value={progress} className="h-2" />
          </div>
          {isUnlocked ? (
            <p className="text-sm text-success font-medium">Access granted</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Waiting for {remainingApprovals} more approval{remainingApprovals > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        {!isUnlocked && (
          <div className="pt-2 border-t border-border space-y-2">
            <Button 
              onClick={onRequestAccess} 
              className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white hover:from-sky-400 hover:to-cyan-400 transition-all duration-150" 
              variant="outline"
              disabled={isRequesting || document.status !== "locked"}
            >
              {isRequesting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Requesting...
                </>
              ) : (
                "Request Threshold Access"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
