"use client"

import { useState } from "react"
import {
  Shield,
  Check,
  User,
  TriangleAlert,
  Clipboard,
  KeyRound,
  Split,
  FileDigit,
  Link2Off,
  Fingerprint,
  Database,
  Lock,
  CheckCircle2,
  FilePlus2,
  Handshake,
  Unlock,
  CircleHelp,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useTheme } from "next-themes"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [isSaving, setIsSaving] = useState(false)
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "U"

  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSaving(false)
    toast({
      title: "Settings saved",
      description: "Your profile has been updated successfully.",
    })
  }

  const handleCopyAccountId = async () => {
    if (!user?.id) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(user.id)
      } else {
        const input = window.document.createElement("textarea")
        input.value = user.id
        input.style.position = "fixed"
        input.style.left = "-9999px"
        window.document.body.appendChild(input)
        input.focus()
        input.select()
        const copied = window.document.execCommand("copy")
        window.document.body.removeChild(input)
        if (!copied) throw new Error("copy failed")
      }
      toast({ title: "Account ID copied", description: "UUID copied to clipboard." })
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy account ID.", variant: "destructive" })
    }
  }

  const handleClearLocalSession = () => {
    localStorage.clear()
    window.location.reload()
  }

  return (
    <AppShell title="Settings">
      <div className="max-w-4xl space-y-6">
        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Manage your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 rounded-md border border-border bg-card/60 p-4">
              <Avatar className="h-16 w-16 ring-2 ring-sky-500/30">
                <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
                <AvatarFallback className="bg-sky-500/15 text-sky-700 text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || "user@company.com"}</p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                <User className="mr-2 h-3.5 w-3.5" />
                Change Avatar
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-id">Account ID</Label>
              <div className="flex items-center gap-2">
                <Input id="account-id" value={user?.id || ""} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={handleCopyAccountId}>
                  <Clipboard className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>Customize how the app looks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme preference</Label>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger id="theme" className="w-full sm:w-[220px]">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">Security & Encryption</CardTitle>
            <CardDescription>Read-only cryptographic and platform configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              All systems secure
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Encryption Algorithm</p>
                <p className="mt-1 text-sm font-semibold">AES-256-GCM</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><KeyRound className="h-3 w-3" /> Key Size</p>
                <p className="mt-1 text-sm font-semibold">256-bit</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Split className="h-3 w-3" /> Key Sharing Scheme</p>
                <p className="mt-1 text-sm font-semibold">Shamir&apos;s Secret Sharing</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Minimum Share Threshold</p>
                <p className="mt-1 text-sm font-semibold">Configurable per document</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Database className="h-3 w-3" /> Storage Backend</p>
                <p className="mt-1 text-sm font-semibold">IPFS via Pinata</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><FileDigit className="h-3 w-3" /> Audit Method</p>
                <p className="mt-1 text-sm font-semibold">SHA-256 Hash Chain</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Link2Off className="h-3 w-3" /> Blockchain Anchoring</p>
                <p className="mt-1 text-sm font-semibold">Disabled (hackathon mode)</p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Fingerprint className="h-3 w-3" /> Identity Verification</p>
                <p className="mt-1 text-sm font-semibold">Local credential hash</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
            <CardDescription>CodeApex TLS secure access flow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium flex items-center gap-2"><FilePlus2 className="h-4 w-4 text-sky-600" /> 1. Document Created</p>
              <p className="mt-1 text-sm text-muted-foreground">Content encrypted with AES-256-GCM. Encryption key split using Shamir&apos;s Secret Sharing and distributed to participants.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium flex items-center gap-2"><CircleHelp className="h-4 w-4 text-amber-600" /> 2. Access Requested</p>
              <p className="mt-1 text-sm text-muted-foreground">A participant requests access. All other participants are notified and must approve.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium flex items-center gap-2"><Handshake className="h-4 w-4 text-emerald-600" /> 3. Threshold Approval</p>
              <p className="mt-1 text-sm text-muted-foreground">Once the required number of approvals is reached, key shares are reconstructed to decrypt the document.</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-sm font-medium flex items-center gap-2"><Unlock className="h-4 w-4 text-indigo-600" /> 4. Secure Access</p>
              <p className="mt-1 text-sm text-muted-foreground">The requester receives time-limited decrypted access. Every action is logged with a SHA-256 hash.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-lg">About</CardTitle>
            <CardDescription>Product and build information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><span className="text-muted-foreground">Product:</span> <span className="font-medium">CodeApex TLS</span></p>
              <p><span className="text-muted-foreground">Version:</span> <span className="font-medium">1.0.0-hackathon</span></p>
              <p className="sm:col-span-2"><span className="text-muted-foreground">Built with:</span> <span className="font-medium">Next.js 14, FastAPI, PostgreSQL, IPFS, pycryptodomex</span></p>
              <p className="sm:col-span-2"><span className="text-muted-foreground">Purpose:</span> <span className="font-medium">Document management system built for secure threshold-controlled collaboration</span></p>
            </div>
            <Badge variant="outline" className="rounded-md">Built for hackathon</Badge>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5 ring-1 ring-destructive/30">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            <CardDescription>Removes all locally cached credentials and document access tokens.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={handleClearLocalSession}>
              <TriangleAlert className="mr-2 h-4 w-4" />
              Sign out and clear all local data
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
