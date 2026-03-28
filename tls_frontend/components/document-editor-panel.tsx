"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { formatDistanceToNow } from "date-fns"
import { Lock, Unlock, Shield, Save, Paperclip } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { Document, DocumentStatus } from "@/lib/document-store"
import { toast } from "@/hooks/use-toast"

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
  isDirty?: boolean
  lastSavedAt?: Date | null
  onContentChange: (content: string) => void
  onSave?: () => Promise<void>
}

const TEXT_FILE_EXTENSIONS = new Set([
  "txt", "md", "js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "cs", "go", "rs", "rb", "php",
  "html", "css", "json", "xml", "yaml", "yml", "sh", "sql", "csv",
])

const BINARY_FILE_EXTENSIONS = new Set(["pdf", "doc", "docx", "xls", "xlsx"])

export function DocumentEditorPanel({
  document,
  content,
  isDirty = false,
  lastSavedAt = null,
  onContentChange,
  onSave,
}: DocumentEditorPanelProps) {
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
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

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() ?? "" : ""
    const reader = new FileReader()

    reader.onload = () => {
      try {
        if (BINARY_FILE_EXTENSIONS.has(extension)) {
          onContentChange(
            `[Uploaded file: ${file.name} - binary file content cannot be displayed as text]`
          )
        } else if (TEXT_FILE_EXTENSIONS.has(extension)) {
          const result = typeof reader.result === "string" ? reader.result : ""
          onContentChange(result)
        } else {
          throw new Error("Unsupported file type")
        }

        toast({
          title: "File loaded",
          description: `${file.name} has been inserted into the document.`,
        })
      } catch {
        toast({
          title: "Upload failed",
          description: "Could not read file.",
          variant: "destructive",
        })
      } finally {
        event.target.value = ""
      }
    }

    reader.onerror = () => {
      toast({
        title: "Upload failed",
        description: "Could not read file.",
        variant: "destructive",
      })
      event.target.value = ""
    }

    if (TEXT_FILE_EXTENSIONS.has(extension)) {
      reader.readAsText(file)
      return
    }
    if (BINARY_FILE_EXTENSIONS.has(extension)) {
      reader.readAsArrayBuffer(file)
      return
    }

    toast({
      title: "Upload failed",
      description: "Could not read file.",
      variant: "destructive",
    })
    event.target.value = ""
  }

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-medium truncate">{document.title}</CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            {!isLocked && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.js,.ts,.jsx,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.html,.css,.json,.xml,.yaml,.yml,.sh,.sql,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={handleFileChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-7 text-xs"
                  onClick={handleUploadClick}
                >
                  <Paperclip className="h-3 w-3" />
                  Upload File
                </Button>
              </>
            )}
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
            {!isLocked && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  isDirty
                    ? "bg-warning/10 text-warning-foreground border-warning/20"
                    : "bg-success/10 text-success border-success/20"
                )}
              >
                {isDirty ? "Unsaved changes" : "Saved"}
              </Badge>
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
          {!isLocked && (
            <>
              <span className="text-border">|</span>
              <span>
                {lastSavedAt
                  ? `Last saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
                  : "Not saved yet"}
              </span>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  )
}
