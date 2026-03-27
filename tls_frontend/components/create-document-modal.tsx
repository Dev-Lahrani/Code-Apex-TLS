"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/hooks/use-toast"
import type { Document, UserDirectory } from "@/lib/document-store"
import { mapApiDocument } from "@/lib/document-store"
import { useAuth } from "@/lib/auth-context"
import { createDocument as createDocumentApi, getUsers } from "@/lib/api"

interface CreateDocumentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateDocument: (document: Document) => void
  userDirectory?: UserDirectory
}

export function CreateDocumentModal({
  open,
  onOpenChange,
  onCreateDocument,
  userDirectory = {},
}: CreateDocumentModalProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = useState("")
  const [directory, setDirectory] = useState<UserDirectory>(userDirectory)
  const [selectedParticipants, setSelectedParticipants] = useState<Array<{ id: string; name: string }>>([])
  const [threshold, setThreshold] = useState("1")
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; participants?: string }>({})

  useEffect(() => {
    setDirectory((prev) => ({ ...prev, ...userDirectory }))
  }, [userDirectory])

  useEffect(() => {
    let cancelled = false
    const loadUsers = async () => {
      try {
        const users = await getUsers()
        if (!cancelled) {
          const mapped = users.reduce<UserDirectory>((acc, item) => {
            acc[item.id] = { name: item.name }
            return acc
          }, {})
          setDirectory((prev) => ({ ...mapped, ...prev }))
        }
      } catch (error) {
        console.error(error)
        toast({
          title: "Unable to load participants",
          description: "Please try again.",
          variant: "destructive",
        })
      }
    }
    if (open) {
      loadUsers()
    }
    return () => {
      cancelled = true
    }
  }, [open, userDirectory])

  const availableParticipants = useMemo(
    () =>
      Object.entries(directory)
        .filter(([id]) => id !== user?.id)
        .map(([id, info]) => ({ id, name: info.name, email: "" })),
    [directory, user?.id]
  )

  const handleAddParticipant = (participantId: string) => {
    const participant = availableParticipants.find((p) => p.id === participantId)
    if (participant && !selectedParticipants.find((p) => p.id === participantId)) {
      setSelectedParticipants([...selectedParticipants, participant])
      setErrors((prev) => ({ ...prev, participants: undefined }))
    }
  }

  const handleRemoveParticipant = (participantId: string) => {
    setSelectedParticipants(selectedParticipants.filter((p) => p.id !== participantId))
  }

  const availableToAdd = availableParticipants.filter((p) => !selectedParticipants.find((sp) => sp.id === p.id))

  const maxThreshold = selectedParticipants.length + (user ? 1 : 0) || 1

  const handleCreate = async () => {
    const newErrors: typeof errors = {}

    if (!title.trim()) {
      newErrors.title = "Title is required"
    }

    if (!user?.id) {
      newErrors.title = "You must be logged in to create a document"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsCreating(true)

    if (!user?.id) {
      setIsCreating(false)
      return
    }

    try {
      const participantIds = Array.from(new Set([...selectedParticipants.map((p) => p.id), user.id]))
      const response = await createDocumentApi({
        title: title.trim(),
        owner_id: user.id,
        participants: participantIds,
        threshold: parseInt(threshold, 10),
        content: "",
      })

      const mapped = mapApiDocument(response.data.document, {
        ...directory,
        ...userDirectory,
        [user.id]: { name: user.name },
      })

      onCreateDocument(mapped)
      onOpenChange(false)

      // Reset form
      setTitle("")
      setSelectedParticipants([])
      setThreshold("1")
      setErrors({})

      toast({
        title: "Document created",
        description: `"${mapped.title}" has been created successfully.`,
      })

      // Navigate to the new document
      router.push(`/documents/${mapped.id}`)
    } catch (error) {
      toast({
        title: "Failed to create document",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false)
      setTitle("")
      setSelectedParticipants([])
      setThreshold("1")
      setErrors({})
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create new document</DialogTitle>
          <DialogDescription>
            Set up a new secure document with threshold access control.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setErrors((prev) => ({ ...prev, title: undefined }))
              }}
              placeholder="Enter document title"
              disabled={isCreating}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
          </div>

          {/* Participants */}
          <div className="space-y-2">
            <Label>Participants</Label>
            <Select onValueChange={handleAddParticipant} disabled={isCreating || availableToAdd.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Add participant" />
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id}>
                    {participant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedParticipants.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedParticipants.map((participant) => (
                  <Badge
                    key={participant.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {participant.name}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => handleRemoveParticipant(participant.id)}
                      disabled={isCreating}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove {participant.name}</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {errors.participants && (
              <p className="text-sm text-destructive">{errors.participants}</p>
            )}
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">Approval threshold</Label>
            <Select
              value={threshold}
              onValueChange={setThreshold}
              disabled={isCreating || selectedParticipants.length === 0}
            >
              <SelectTrigger id="threshold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxThreshold }, (_, i) => i + 1).map((num) => (
                  <SelectItem key={num} value={String(num)}>
                    {num} approval{num > 1 ? "s" : ""} required
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Document will unlock when {threshold} participant{parseInt(threshold) > 1 ? "s" : ""} approve access.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
            {isCreating ? (
              <>
                <Spinner className="h-4 w-4" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
