"use client"

import { Shield, Lock, UserCheck, FileCheck, Loader2, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Document } from "@/lib/document-store"

interface SecurityPanelProps {
  document: Document
  isSyncing?: boolean
}

export function SecurityPanel({ document, isSyncing = false }: SecurityPanelProps) {
  const thresholdTypeLabel = document.thresholdType.charAt(0).toUpperCase() + document.thresholdType.slice(1)
  const ipfsCid = (document as unknown as { ipfs_cid?: string | null }).ipfs_cid
  return (
    <Card className="ring-1 ring-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security
          {isSyncing && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Syncing…
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="rounded-md bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </Badge>
            <Badge variant="outline" className="rounded-md gap-1">
              <Lock className="h-3 w-3 text-emerald-600" />
              AES-256-GCM
            </Badge>
            <Badge variant="outline" className="rounded-md gap-1">
              Threshold {document.currentApprovals}/{document.requiredApprovals}
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {thresholdTypeLabel}
            </Badge>
            {ipfsCid && (
              <Badge variant="outline" className="rounded-md border-violet-500/30 bg-violet-500/10 text-violet-600">
                IPFS Stored
              </Badge>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-sm">
            <div className="rounded-md border border-border bg-card/70 p-3 flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-xs text-muted-foreground">Identity</p>
                <p className="font-medium text-foreground">Verified</p>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card/70 p-3 flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-sky-600" />
              <div>
                <p className="text-xs text-muted-foreground">Audit Trail</p>
                <p className="font-medium text-foreground">Hash Chained</p>
              </div>
            </div>
            <div className="rounded-md border border-border bg-card/70 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">Policy</p>
                <p className="font-medium text-foreground">Threshold Enforced</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
