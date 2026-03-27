"use client"

import { Shield, Lock, UserCheck, FileCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Document } from "@/lib/document-store"

interface SecurityPanelProps {
  document: Document
}

const securityItems = [
  { label: "Encryption", value: "Active", icon: Lock },
  { label: "Identity", value: "Verified", icon: UserCheck },
  { label: "Audit", value: "Enabled", icon: FileCheck },
]

export function SecurityPanel({ document }: SecurityPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Security
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Threshold:</span>
            <span className="font-medium">{document.currentApprovals}/{document.requiredApprovals}</span>
          </div>
          {securityItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <item.icon className="h-3.5 w-3.5 text-success" />
              <span className="text-muted-foreground">{item.label}:</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
