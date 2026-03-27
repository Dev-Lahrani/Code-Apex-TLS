'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, Lock, Unlock, Clock, Shield, CheckCircle2, AlertCircle, LogIn } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Document {
  id: string
  title: string
  status: 'locked' | 'pending' | 'unlocked'
  approvalThreshold: number
  approvalsNeeded: number
  participants: string[]
  lastModified: string
}

interface DocumentViewerProps {
  document: Document
  onBack: () => void
}

interface AuditEntry {
  id: string
  time: string
  user: string
  action: string
  status: 'pending' | 'completed'
  hash?: string
  verified?: boolean
}

const sampleContent = "" // Content should be loaded from backend

// Generate a simple hash for demonstration
const generateHash = () => Math.random().toString(16).substring(2, 10).toUpperCase()

export function DocumentViewer({ document, onBack }: DocumentViewerProps) {
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [accessRequested, setAccessRequested] = useState(false)
  const [thresholdReached, setThresholdReached] = useState(false)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]) // Audit log should be loaded from backend

  const isEditable = document.status === 'unlocked'
  const approvalsReceived = document.approvalThreshold - document.approvalsNeeded
  const approvalPercentage = (approvalsReceived / document.approvalThreshold) * 100

  // Detect threshold moment
  useEffect(() => {
    if (approvalsReceived >= document.approvalThreshold && !thresholdReached) {
      setThresholdReached(true)
      // Add threshold event to audit log
      const newEntry: AuditEntry = {
        id: `threshold-${Date.now()}`,
        time: 'now',
        user: 'System',
        action: 'Threshold met — secure access granted',
        status: 'completed',
        hash: generateHash(),
        verified: true,
      }
      setAuditLog(prev => [newEntry, ...prev])
    }
  }, [approvalsReceived, document.approvalThreshold, thresholdReached])

  const participants: Array<{ name: string; role: string; status: string; approved: boolean }> = [] // Participants should be loaded from backend

  // Get approval status text
  const getApprovalText = () => {
    if (approvalsReceived === 0) {
      return 'No approvals received yet'
    } else if (document.approvalsNeeded === 0) {
      return `${approvalsReceived} of ${document.approvalThreshold} approvals received`
    } else {
      return `${approvalsReceived} of ${document.approvalThreshold} approvals received • Waiting for ${document.approvalsNeeded} more`
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <motion.div
        className="h-full flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Top Navigation */}
        <div className="h-14 bg-card border-b border-border flex items-center justify-between px-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h2 className="text-xl font-bold text-foreground">{document.title}</h2>
          <div className="w-24" />
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 flex gap-4 p-6 bg-background">
          {/* Left Panel - Access Control */}
          <motion.div
            className="w-80 bg-card border border-border rounded-lg p-6 overflow-auto"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Access Control
            </h3>

            {/* Status */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Document Status</p>
              <motion.div
                className={`p-4 rounded-lg border flex items-center gap-3 ${
                  isEditable
                    ? 'bg-secondary/10 border-secondary'
                    : thresholdReached
                    ? 'bg-secondary/10 border-secondary'
                    : 'bg-destructive/10 border-destructive'
                }`}
                animate={{
                  boxShadow: thresholdReached
                    ? ['0 0 0 0 rgba(34, 197, 94, 0.3)', '0 0 0 8px rgba(34, 197, 94, 0)']
                    : 'none',
                }}
                transition={{ duration: 0.6, repeat: thresholdReached ? 1 : 0 }}
              >
                {isEditable ? (
                  <Unlock className="w-5 h-5 text-secondary flex-shrink-0" />
                ) : (
                  <Lock className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <div>
                  <span className="text-sm font-bold text-foreground block">
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </span>
                  {thresholdReached && <span className="text-xs text-secondary font-medium">Access Granted</span>}
                </div>
              </motion.div>
            </div>

            {/* Approval Progress */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Approval Progress</p>
              <div className="space-y-3">
                <div className="space-y-1">
                  <p className="text-sm text-foreground font-medium">
                    {approvalsReceived} of {document.approvalThreshold} approvals received
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getApprovalText()}
                  </p>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full transition-all ${
                      thresholdReached ? 'bg-secondary' : 'bg-accent'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${approvalPercentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="mb-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-3">Participants</p>
              <div className="space-y-2">
                {participants.map((participant, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted rounded-md"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{participant.name}</p>
                        <p className="text-xs text-muted-foreground">{participant.role}</p>
                      </div>
                    </div>
                    {participant.approved ? (
                      <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-accent flex-shrink-0" />
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Security Info */}
            <div className="mb-6 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Security Configuration</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-1.5 px-2 bg-muted rounded">
                  <span className="text-muted-foreground">Threshold</span>
                  <span className="font-medium text-foreground">{approvalsReceived}/{document.approvalThreshold}</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted rounded">
                  <span className="text-muted-foreground">Encryption</span>
                  <span className="font-medium text-secondary">Active</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 bg-muted rounded">
                  <span className="text-muted-foreground">Audit</span>
                  <span className="font-medium text-secondary">Enabled</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              {!accessRequested && !isEditable && (
                <motion.button
                  onClick={() => setAccessRequested(true)}
                  className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogIn className="w-4 h-4" />
                  Request Access
                </motion.button>
              )}
              <button
                onClick={() => setShowAuditLog(!showAuditLog)}
                className="w-full px-4 py-2.5 bg-muted text-foreground rounded-md font-medium hover:bg-muted/80 transition-colors text-sm"
              >
                {showAuditLog ? 'Hide' : 'Show'} Audit Log
              </button>
            </div>
          </motion.div>

          {/* Center Panel - Editor */}
          <motion.div
            className="flex-1 bg-card border border-border rounded-lg p-8 overflow-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="relative">
              <textarea
                value={sampleContent}
                readOnly={!isEditable}
                className={`w-full h-96 p-4 bg-background border border-border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary ${
                  isEditable
                    ? 'cursor-text'
                    : 'cursor-not-allowed opacity-75'
                }`}
              />
              {!isEditable && (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Lock className="w-8 h-8 text-destructive mx-auto mb-3" />
                    </motion.div>
                    <p className="text-sm font-semibold text-foreground">Document is locked</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {approvalsReceived === 0
                        ? 'No approvals yet'
                        : `Waiting for ${document.approvalsNeeded} more approval${document.approvalsNeeded !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Right Panel - Audit Log */}
          <AnimatePresence>
            {showAuditLog && (
              <motion.div
                className="w-96 bg-card border border-border rounded-lg p-6 overflow-auto"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Audit Log
                </h3>
                <p className="text-xs text-muted-foreground mb-6">Complete activity history</p>

                <div className="space-y-3">
                  {auditLog.length === 0 ? (
                    <div className="py-8 text-center">
                      <AlertCircle className="w-6 h-6 text-muted-foreground/50 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No audit events yet</p>
                    </div>
                  ) : (
                    auditLog.map((entry, i) => (
                      <motion.div
                        key={entry.id}
                        className="p-4 bg-muted rounded-md border border-border/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.05 }}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground">{entry.user}</p>
                              <p className="text-sm font-medium text-foreground mt-1">{entry.action}</p>
                            </div>
                            {entry.status === 'completed' ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.3 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                              </motion.div>
                            ) : (
                              <Clock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/30">
                            <span className="text-xs text-muted-foreground">{entry.time}</span>
                            {entry.hash && (
                              <span className="text-xs font-mono text-muted-foreground/70">{entry.hash}</span>
                            )}
                          </div>
                          {entry.verified && (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary/15 rounded text-xs font-medium text-secondary">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Access Requested Notification */}
      <AnimatePresence>
        {accessRequested && (
          <motion.div
            className="fixed bottom-6 right-6 bg-secondary text-secondary-foreground px-6 py-4 rounded-lg shadow-xl flex items-center gap-4 max-w-sm border border-secondary/20"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            </motion.div>
            <div className="flex-1">
              <p className="font-semibold text-sm">Access request sent</p>
              <p className="text-xs opacity-90">Awaiting approver confirmation</p>
            </div>
            <button
              onClick={() => setAccessRequested(false)}
              className="text-secondary-foreground/60 hover:text-secondary-foreground transition-colors flex-shrink-0"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
