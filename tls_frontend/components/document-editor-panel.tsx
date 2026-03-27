"use client"

import { useState } from "react"
import { Lock, Unlock, Shield, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { Document, DocumentStatus } from "@/lib/document-store"

const statusConfig: Record<DocumentStatus, { label: string; icon: typeof Lock; className: string }> = {
  locked: {
    label: "Locked",
    icon: Lock,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  pending: {
    label: "Pending",
    icon: Lock,
    className: "bg-warning/10 text-warning-foreground border-warning/20",
  },
  unlocked: {
    label: "Unlocked",
    icon: Unlock,
    className: "bg-success/10 text-success border-success/20",
  },
}

interface DocumentEditorPanelProps {
  document: Document
  content: string
  onContentChange: (content: string) => void
  onSave?: () => Promise<void>
}

export function DocumentEditorPanel({
  document,
  content,
  onContentChange,
  onSave,
}: DocumentEditorPanelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const status = statusConfig[document.status]
  const StatusIcon = status.icon
  const isLocked = document.status !== "unlocked"

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium truncate">{document.title}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {!isLocked && onSave && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-7 text-xs"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Spinner className="h-3 w-3" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            )}
            <Badge variant="outline" className={cn("gap-1", status.className)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 relative">
        {isLocked ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 p-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Lock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Access Restricted</p>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                This document requires threshold approval before it can be accessed.
              </p>
            </div>
          </div>
        ) : null}
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          disabled={isLocked}
          placeholder="Start typing..."
          className={cn(
            "min-h-[400px] h-full resize-none rounded-none border-0 focus-visible:ring-0 p-4",
            isLocked && "opacity-30 cursor-not-allowed"
          )}
        />
      </CardContent>
      <CardFooter className="border-t border-border py-2 px-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3 w-3" />
          <span>Encrypted document</span>
          <span className="text-border">|</span>
          <span>Threshold secured</span>
        </div>
      </CardFooter>
    </Card>
  )
}
