"use client"

import { CheckCircle2, Clock, Circle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import type { Document, Participant, ParticipantStatus } from "@/lib/document-store"

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
  currentUserId = "p2",
  requesterId,
  isRequesting = false,
  isApproving = null,
}: AccessControlPanelProps) {
  const progress = (document.currentApprovals / document.requiredApprovals) * 100
  const remainingApprovals = document.requiredApprovals - document.currentApprovals
  const isUnlocked = document.status === "unlocked"

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Access Control</CardTitle>
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
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2"
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
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Approval Progress</p>
            <span className="text-sm font-medium">
              {document.currentApprovals}/{document.requiredApprovals}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
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
              className="w-full" 
              variant="outline"
              disabled={isRequesting || document.status !== "locked"}
            >
              {isRequesting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Requesting...
                </>
              ) : (
                "Request Access"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
